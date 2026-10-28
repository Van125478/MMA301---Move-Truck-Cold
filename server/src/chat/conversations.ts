import { isValidObjectId } from "mongoose";
import { HttpError } from "../middlewares/errorHandler.js";
import { Conversation } from "../models/conversation.js";
import { Message } from "../models/message.js";
import { Shipment } from "../models/shipment.js";
import { User } from "../models/user.js";
import { chatWritable } from "./chatAccess.js";

const PAGE_LIMIT = 50;

export type ConversationDto = {
  id: string;
  shipmentId: string;
  carrierLabel: string;
  writable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InboxItemDto = {
  conversationId: string;
  shipmentId: string;
  shipmentTitle: string;
  routeLabel: string;
  unreadCount: number;
  lastMessageBody: string;
  lastMessageAt: string | null;
  lastSenderRole: "SHIPPER" | "CARRIER" | null;
  lastMessageId: string | null;
};

export async function unreadCarrierChatCount(carrierId: string): Promise<number> {
  const conversations = await Conversation.find({ carrierId }).select("_id carrierReadSequence");
  let total = 0;
  for (const row of conversations) {
    total += await Message.countDocuments({
      conversationId: row._id,
      senderRole: "SHIPPER",
      sequence: { $gt: row.carrierReadSequence ?? 0 },
    });
  }
  return total;
}

export async function listCarrierInbox(carrierId: string): Promise<InboxItemDto[]> {
  const conversations = await Conversation.find({ carrierId }).sort({ updatedAt: -1, _id: -1 }).limit(50);
  const items: InboxItemDto[] = [];
  for (const conversation of conversations) {
    const shipment = await Shipment.findById(conversation.shipmentId).select("cargoDescription pickupLocation deliveryLocation");
    const last = await Message.findOne({ conversationId: conversation._id }).sort({ sequence: -1, _id: -1 });
    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      senderRole: "SHIPPER",
      sequence: { $gt: conversation.carrierReadSequence ?? 0 },
    });
    const title = shipment?.cargoDescription?.trim() || "Chuyến hàng";
    const routeLabel =
      shipment?.pickupLocation && shipment?.deliveryLocation
        ? `${shipment.pickupLocation} → ${shipment.deliveryLocation}`
        : title;
    items.push({
      conversationId: conversation._id.toString(),
      shipmentId: conversation.shipmentId.toString(),
      shipmentTitle: title,
      routeLabel,
      unreadCount,
      lastMessageBody: last?.body?.trim() || "Chưa có tin nhắn",
      lastMessageAt: last?.createdAt?.toISOString() ?? null,
      lastSenderRole: last?.senderRole ?? null,
      lastMessageId: last?._id.toString() ?? null,
    });
  }
  return items;
}

async function markCarrierConversationRead(conversationId: string, carrierId: string): Promise<void> {
  const conversation = await Conversation.findOne({ _id: conversationId, carrierId });
  if (!conversation) return;
  const latest = await Message.findOne({ conversationId: conversation._id }).sort({ sequence: -1, _id: -1 }).select("sequence");
  const nextRead = latest?.sequence ?? conversation.nextSequence;
  if (nextRead > (conversation.carrierReadSequence ?? 0)) {
    await Conversation.updateOne({ _id: conversation._id }, { $set: { carrierReadSequence: nextRead } });
  }
}

export type MessageDto = {
  id: string;
  conversationId: string;
  senderRole: "SHIPPER" | "CARRIER";
  body: string;
  sequence: number;
  createdAt: string;
};

export async function openCarrierConversation(shipmentId: string, carrierId: string): Promise<ConversationDto> {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) throw new HttpError(404, "not_found", "Không tìm thấy đơn này.");
  const existing = await Conversation.findOne({ shipmentId: shipment._id, carrierId });
  if (existing) return toConversationDto(existing, chatWritable(shipment, carrierId), await carrierLabel(carrierId));
  if (!chatWritable(shipment, carrierId)) throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
  try {
    const created = await Conversation.create({
      shipmentId: shipment._id,
      shipperId: shipment.shipperId,
      carrierId,
      nextSequence: 0,
    });
    return toConversationDto(created, true, await carrierLabel(carrierId));
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const again = await Conversation.findOne({ shipmentId: shipment._id, carrierId });
    if (!again) throw error;
    return toConversationDto(again, chatWritable(shipment, carrierId), await carrierLabel(carrierId));
  }
}

export async function openShipperConversation(shipmentId: string, shipperId: string): Promise<ConversationDto> {
  const shipment = await ownShipment(shipmentId, shipperId);
  if (!shipment.carrierId) {
    throw new HttpError(409, "claim_required", "Chỉ nhắn tin với nhà xe đã nhận đơn.");
  }
  const carrierId = shipment.carrierId.toString();
  const existing = await Conversation.findOne({ shipmentId: shipment._id, carrierId });
  if (existing) return toConversationDto(existing, chatWritable(shipment, carrierId), await carrierLabel(carrierId));
  try {
    const created = await Conversation.create({
      shipmentId: shipment._id,
      shipperId: shipment.shipperId,
      carrierId,
      nextSequence: 0,
    });
    return toConversationDto(created, chatWritable(shipment, carrierId), await carrierLabel(carrierId));
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const again = await Conversation.findOne({ shipmentId: shipment._id, carrierId });
    if (!again) throw error;
    return toConversationDto(again, chatWritable(shipment, carrierId), await carrierLabel(carrierId));
  }
}

export async function listShipperConversations(shipmentId: string, shipperId: string): Promise<ConversationDto[]> {
  const shipment = await ownShipment(shipmentId, shipperId);
  const conversations = await Conversation.find({ shipmentId: shipment._id, shipperId }).sort({ updatedAt: -1, _id: 1 });
  const carriers = await User.find({ _id: { $in: conversations.map((item) => item.carrierId) } }).select("displayName");
  const names = new Map(carriers.map((user) => [user.id, labelOf(user.displayName)]));
  return conversations.map((item) =>
    toConversationDto(item, chatWritable(shipment, item.carrierId.toString()), names.get(item.carrierId.toString()) ?? "Nhà xe"),
  );
}

export async function readMessages(input: {
  conversationId: string;
  shipmentId?: string;
  shipperId?: string;
  carrierId?: string;
  after: number;
}): Promise<{ messages: MessageDto[]; writable: boolean }> {
  const conversation = await visibleConversation(input);
  const shipment = await Shipment.findById(conversation.shipmentId);
  if (!shipment) throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
  const messages = await Message.find({ conversationId: conversation._id, sequence: { $gt: input.after } })
    .sort({ sequence: 1, _id: 1 })
    .limit(PAGE_LIMIT);
  if (input.carrierId) {
    await markCarrierConversationRead(conversation._id.toString(), input.carrierId);
  }
  return {
    messages: messages.map(toMessageDto),
    writable: chatWritable(shipment, conversation.carrierId.toString()),
  };
}

export async function appendMessage(input: {
  conversationId: string;
  shipmentId?: string;
  shipperId?: string;
  carrierId?: string;
  senderId: string;
  senderRole: "SHIPPER" | "CARRIER";
  body: string;
}): Promise<MessageDto> {
  const conversation = await visibleConversation(input);
  const shipment = await Shipment.findById(conversation.shipmentId);
  if (!shipment || !chatWritable(shipment, conversation.carrierId.toString())) {
    throw new HttpError(409, "conflict", "Cuộc trao đổi này không còn nhận tin nhắn.");
  }
  const counted = await Conversation.findOneAndUpdate({ _id: conversation._id }, { $inc: { nextSequence: 1 } }, { returnDocument: "after" });
  const fresh = await Shipment.findById(conversation.shipmentId);
  if (!counted || !fresh || !chatWritable(fresh, conversation.carrierId.toString())) {
    throw new HttpError(409, "conflict", "Cuộc trao đổi này không còn nhận tin nhắn.");
  }
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: input.senderId,
    senderRole: input.senderRole,
    body: input.body,
    sequence: counted.nextSequence,
  });
  return toMessageDto(message);
}

export function readAfter(value: unknown): number {
  if (value == null || value === "") return 0;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new HttpError(400, "invalid_request", "Mốc tin nhắn không hợp lệ.");
  }
  return Number(raw);
}

async function ownShipment(shipmentId: string, shipperId: string) {
  if (!isValidObjectId(shipmentId)) throw new HttpError(404, "not_found", "Không tìm thấy đơn này.");
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment || shipment.shipperId.toString() !== shipperId) {
    throw new HttpError(404, "not_found", "Không tìm thấy đơn này.");
  }
  return shipment;
}

async function visibleConversation(input: { conversationId: string; shipmentId?: string; shipperId?: string; carrierId?: string }) {
  if (!isValidObjectId(input.conversationId)) throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
  const conversation = await Conversation.findById(input.conversationId);
  if (!conversation) throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
  if (input.carrierId && conversation.carrierId.toString() !== input.carrierId) {
    throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
  }
  if (input.shipperId) {
    if (conversation.shipperId.toString() !== input.shipperId) {
      throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
    }
    if (input.shipmentId && conversation.shipmentId.toString() !== input.shipmentId) {
      throw new HttpError(404, "not_found", "Không tìm thấy cuộc trao đổi này.");
    }
  }
  return conversation;
}

async function carrierLabel(carrierId: string): Promise<string> {
  const user = await User.findById(carrierId).select("displayName");
  return labelOf(user?.displayName);
}

function labelOf(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Nhà xe";
}

function toConversationDto(
  conversation: { _id: { toString(): string }; shipmentId: { toString(): string }; createdAt: Date; updatedAt: Date },
  writable: boolean,
  carrierLabelText: string,
): ConversationDto {
  return {
    id: conversation._id.toString(),
    shipmentId: conversation.shipmentId.toString(),
    carrierLabel: carrierLabelText,
    writable,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function toMessageDto(message: {
  _id: { toString(): string };
  conversationId: { toString(): string };
  senderRole: "SHIPPER" | "CARRIER";
  body: string;
  sequence: number;
  createdAt: Date;
}): MessageDto {
  return {
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderRole: message.senderRole,
    body: message.body,
    sequence: message.sequence,
    createdAt: message.createdAt.toISOString(),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

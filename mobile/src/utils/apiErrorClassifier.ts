import { ApiError } from "../services/api/client";

export type ApiErrorKind = "network" | "session" | "forbidden" | "notFound" | "server";

export function classifyApiError(error: unknown): { kind: ApiErrorKind; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return { kind: "network", message: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." };
    }
    if (error.status === 401) {
      return { kind: "session", message: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." };
    }
    if (error.status === 403) {
      return { kind: "forbidden", message: "Tài khoản này không có quyền xem nội dung này." };
    }
    if (error.status === 404) {
      return { kind: "notFound", message: "Không tìm thấy đơn. Có thể đơn đã bị xóa." };
    }
    return { kind: "server", message: error.message || "Máy chủ gặp lỗi. Hãy thử lại." };
  }
  return { kind: "server", message: "Không tải được dữ liệu. Hãy thử lại." };
}

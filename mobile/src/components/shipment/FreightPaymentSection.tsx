import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ChoiceChip, ConfirmDialog } from "../common/Feedback";
import { Field } from "../common/Field";
import { FieldError } from "../common/FieldError";
import { PrimaryButton } from "../common/PrimaryButton";
import { radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import {
  confirmFreightPayment,
  loadFreightPayment,
  recordFreightPayment,
  type FreightMethod,
  type FreightPayment,
} from "../../services/api/shipments";
import { formatVnd, formatWhen } from "../../utils/format";

type Role = "SHIPPER" | "CARRIER" | "DRIVER";

export function FreightPaymentSection({
  shipmentId,
  role,
  delivered,
}: {
  shipmentId: string;
  role: Role;
  delivered: boolean;
}) {
  const { colors } = useTheme();
  const [payment, setPayment] = useState<FreightPayment | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<FreightMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [pending, setPending] = useState<"record" | "confirm" | null>(null);
  const [confirm, setConfirm] = useState<"record" | "confirm" | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await loadFreightPayment(shipmentId);
      setPayment(next);
      setMissing(false);
      setError(null);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setPayment(null);
        setMissing(true);
        setError(null);
        return;
      }
      setError(caught instanceof ApiError ? caught.message : "Không tải được thanh toán.");
    }
  }, [shipmentId]);

  useEffect(() => {
    setMethod("BANK_TRANSFER");
    setReference("");
    setReferenceError(null);
    setConfirm(null);
    void load();
  }, [load, delivered]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: "record" | "confirm") {
    setPending(action);
    setError(null);
    try {
      const next =
        action === "record"
          ? await recordFreightPayment(shipmentId, method, method === "BANK_TRANSFER" ? reference.trim() : null)
          : await confirmFreightPayment(shipmentId);
      setPayment(next);
      setConfirm(null);
      setReference("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không ghi được thanh toán.");
      setConfirm(null);
      await load();
    } finally {
      setPending(null);
    }
  }

  if (missing) {
    return (
      <View style={[styles.section, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.ink }]}>Thanh toán cước</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>Máy chủ này chưa mở ghi nhận thanh toán cước.</Text>
      </View>
    );
  }

  const canRecord = role === "SHIPPER" && delivered && payment?.status === "UNPAID";
  const canConfirm = role === "CARRIER" && payment?.status === "RECORDED";
  const amount = payment ? formatVnd(payment.amountVnd) : "";

  return (
    <View style={[styles.section, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.ink }]}>Thanh toán cước</Text>
      <Text style={[styles.meta, { color: colors.muted }]}>Cước trả cho nhà xe. Coldi không thu hộ.</Text>
      {payment ? <Text style={[styles.status, { color: colors.ink }]}>{payment.label}</Text> : <Text style={[styles.meta, { color: colors.muted }]}>Đang tải thanh toán…</Text>}
      {payment?.methodLabel ? <Fact label="Cách trả" value={payment.methodLabel} /> : null}
      {payment?.reference ? <Fact label="Mã giao dịch" value={payment.reference} /> : null}
      {payment?.recordedAt ? <Fact label="Ghi nhận lúc" value={formatWhen(payment.recordedAt)} /> : null}
      {payment?.confirmedAt ? <Fact label="Xác nhận lúc" value={formatWhen(payment.confirmedAt)} /> : null}
      {error ? <FieldError message={error} /> : null}
      {canRecord ? (
        <>
          <Text style={[styles.meta, { color: colors.ink }]}>Số tiền đúng bằng cước niêm yết {amount}.</Text>
          <View style={styles.chips}>
            <ChoiceChip label="Chuyển khoản" selected={method === "BANK_TRANSFER"} onPress={() => setMethod("BANK_TRANSFER")} />
            <ChoiceChip label="Tiền mặt" selected={method === "CASH"} onPress={() => setMethod("CASH")} />
          </View>
          {method === "BANK_TRANSFER" ? (
            <Field
              label="Mã giao dịch"
              value={reference}
              onChangeText={(value) => {
                setReference(value);
                setReferenceError(null);
              }}
              error={referenceError}
              placeholder="Ví dụ FT123456"
              maxLength={40}
              autoCapitalize="characters"
            />
          ) : null}
          <PrimaryButton
            spaced={false}
            label="Ghi nhận đã thanh toán"
            pending={pending === "record"}
            pendingLabel="Đang ghi nhận…"
            onPress={() => {
              if (method === "BANK_TRANSFER" && !/^[A-Za-z0-9-]{4,40}$/.test(reference.trim())) {
                setReferenceError("Nhập mã giao dịch từ 4 đến 40 ký tự, chỉ chữ, số và dấu gạch ngang.");
                return;
              }
              setConfirm("record");
            }}
          />
        </>
      ) : null}
      {canConfirm ? (
        <PrimaryButton
          spaced={false}
          label="Xác nhận đã nhận tiền"
          pending={pending === "confirm"}
          pendingLabel="Đang xác nhận…"
          onPress={() => setConfirm("confirm")}
        />
      ) : null}
      <ConfirmDialog
        visible={confirm !== null}
        title={confirm === "confirm" ? "Xác nhận đã nhận tiền?" : "Ghi nhận đã thanh toán?"}
        body={
          confirm === "confirm"
            ? "Nhà xe xác nhận đã nhận đủ cước từ chủ hàng. Coldi không thu khoản này."
            : `Ghi nhận đã trả ${amount} bằng ${method === "CASH" ? "tiền mặt" : "chuyển khoản"}. Đây là biên nhận giữa hai bên, không phải cổng thanh toán.`
        }
        confirmLabel={confirm === "confirm" ? "Đã nhận tiền" : "Ghi nhận"}
        tone="primary"
        pending={pending !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void run(confirm);
        }}
      />
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Text style={[styles.meta, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26 },
  status: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  factValue: { flex: 1, textAlign: "right", fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
});

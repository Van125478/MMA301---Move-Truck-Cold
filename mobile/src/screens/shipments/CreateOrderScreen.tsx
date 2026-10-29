import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChoiceChip } from "../../components/common/Feedback";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { CargoImagePicker } from "../../components/shipment/CargoImagePicker";
import { CARGO_IMAGE_MAX, CARGO_IMAGE_MIN, useCargoImages } from "../../features/shipments/useCargoImages";
import { emptyDraft, stepFields, validateOrder, type OrderDraft } from "../../features/shipments/validateOrder";
import { ApiError } from "../../services/api/client";
import { createShipment } from "../../services/api/shipments";
import { temperatureGroups, type TemperatureGroup } from "../../types/shipment";

const temperatureCopy: Record<TemperatureGroup, string> = {
  COOL: "Lạnh mát",
  FROZEN: "Đông",
  DEEP_FROZEN: "Cực lạnh",
};

const stepTitle = ["Điểm bốc hàng", "Điểm giao hàng", "Hàng hóa và cước"] as const;

export function CreateOrderScreen({ onCreated }: { onCreated: (id: string) => void }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const cargo = useCargoImages();
  const [imageNotice, setImageNotice] = useState<string | null>(null);

  function set<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFields((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function show(nextFields: Record<string, string>, nextStep: 1 | 2 | 3, message: string | null) {
    setFields(nextFields);
    setStep(nextStep);
    setFormError(message);
  }

  async function next() {
    const result = validateOrder(draft);
    if (!result.ok && result.step <= step) {
      show(result.fields, result.step, "Một số thông tin đơn chưa hợp lệ.");
      return;
    }
    const currentErrors = stepFields(step, result.ok ? {} : result.fields);
    if (Object.keys(currentErrors).length > 0) {
      show(result.ok ? {} : result.fields, step, "Một số thông tin đơn chưa hợp lệ.");
      return;
    }
    if (step < 3) {
      setFormError(null);
      setStep((step + 1) as 2 | 3);
      return;
    }
    if (!result.ok) {
      show(result.fields, result.step, "Một số thông tin đơn chưa hợp lệ.");
      return;
    }
    if (cargo.uploading) {
      setFormError("Còn ảnh đang tải lên. Hãy đợi xong rồi đăng đơn.");
      return;
    }
    if (cargo.ids.length < CARGO_IMAGE_MIN) {
      setFormError(`Thêm ít nhất ${CARGO_IMAGE_MIN} ảnh hàng hóa.`);
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const created = await createShipment({ ...result.body, cargoImageIds: cargo.ids });
      cargo.reset();
      setDraft(emptyDraft);
      setStep(1);
      setFields({});
      onCreated(created.id);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        const merged = { ...error.fields };
        const first = Object.keys(merged)[0];
        const nextStep = first?.startsWith("pickup") ? 1 : first?.startsWith("delivery") ? 2 : 3;
        show(merged, nextStep, error.message);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Không đăng được đơn. Hãy thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  const shown = stepFields(step, fields);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <Text style={[styles.kicker, { color: colors.primary }]}>BƯỚC {step}/3</Text>
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step }}>
          {[1, 2, 3].map((index) => (
            <View
              key={index}
              style={[styles.progressSegment, { backgroundColor: index <= step ? colors.primary : colors.line }]}
            />
          ))}
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {stepTitle[step - 1]}
        </Text>
        <Text style={[styles.lede, { color: colors.muted }]}>Đơn gửi lên ở trạng thái Đang tìm xe. Chưa gán nhà xe.</Text>
        {formError ? (
          <View accessibilityRole="alert">
            <FieldError message={formError} />
          </View>
        ) : null}
        {step === 1 ? (
          <PlaceFields
            prefix="pickup"
            companyLabel="Công ty hoặc kho gửi"
            locationLabel="Địa chỉ lấy hàng"
            contactLabel="Người bốc hàng"
            phoneLabel="Điện thoại lấy hàng"
            emailLabel="Email nhận thông báo"
            dateLabel="Ngày lấy hàng"
            fromLabel="Giờ bắt đầu bốc"
            toLabel="Giờ kết thúc bốc"
            draft={draft}
            errors={shown}
            onChange={set}
          />
        ) : null}
        {step === 2 ? (
          <PlaceFields
            prefix="delivery"
            companyLabel="Công ty hoặc kho nhận"
            locationLabel="Địa chỉ giao hàng"
            contactLabel="Người nhận hàng"
            phoneLabel="Điện thoại giao hàng"
            emailLabel="Email kho nhận"
            dateLabel="Ngày giao muộn nhất"
            fromLabel="Giờ bắt đầu nhận"
            toLabel="Giờ kết thúc nhận"
            draft={draft}
            errors={shown}
            onChange={set}
          />
        ) : null}
        {step === 3 ? (
          <View>
            <Field label="Mô tả hàng hóa" value={draft.cargoDescription} onChangeText={(value) => set("cargoDescription", value)} error={shown.cargoDescription ?? null} autoCapitalize="sentences" multiline maxLength={300} />
            <Text style={[styles.groupLabel, { color: colors.ink }]}>Nhóm nhiệt</Text>
            <View style={styles.chips}>
              {temperatureGroups.map((group) => (
                <ChoiceChip key={group} label={temperatureCopy[group]} selected={draft.temperatureGroup === group} onPress={() => set("temperatureGroup", group)} />
              ))}
            </View>
            <FieldError message={shown.temperatureGroup ?? null} />
            <Field label="Trọng lượng (tấn)" value={draft.cargoWeightTon} onChangeText={(value) => set("cargoWeightTon", value)} error={shown.cargoWeightTon ?? null} keyboardType="decimal-pad" placeholder="1.5" />
            <Field label="Thể tích (m³)" value={draft.cargoVolumeM3} onChangeText={(value) => set("cargoVolumeM3", value)} error={shown.cargoVolumeM3 ?? null} keyboardType="decimal-pad" placeholder="8" />
            <Field label="Số thùng" value={draft.packageCount} onChangeText={(value) => set("packageCount", value.replace(/\D/g, ""))} error={shown.packageCount ?? null} keyboardType="number-pad" />
            <Field label="Yêu cầu xe" value={draft.vehicleRequirement} onChangeText={(value) => set("vehicleRequirement", value)} error={shown.vehicleRequirement ?? null} autoCapitalize="sentences" maxLength={160} />
            <Text style={[styles.groupLabel, { color: colors.ink }]}>Ảnh hàng hóa ({cargo.ids.length}/{CARGO_IMAGE_MAX})</Text>
            <CargoImagePicker
              images={cargo.images}
              max={CARGO_IMAGE_MAX}
              onPick={() => void cargo.pickImage().then(setImageNotice)}
              onRemove={cargo.removeImage}
              error={imageNotice}
            />
            <Field label="Cước niêm yết (đồng)" value={draft.listedPriceVnd} onChangeText={(value) => set("listedPriceVnd", value.replace(/\D/g, ""))} error={shown.listedPriceVnd ?? null} keyboardType="number-pad" />
          </View>
        ) : null}
        <View style={styles.actions}>
          {step > 1 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại bước trước" onPress={() => setStep((step - 1) as 1 | 2)} style={[styles.back, pointer, { borderColor: colors.line }]}>
              <Text style={[styles.backText, { color: colors.ink }]}>Quay lại</Text>
            </Pressable>
          ) : null}
          <View style={styles.grow}>
            <PrimaryButton spaced={false} label={step === 3 ? "Đăng đơn" : "Tiếp tục"} pendingLabel="Đang đăng đơn…" pending={pending} onPress={() => void next()} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PlaceFields({
  prefix,
  companyLabel,
  locationLabel,
  contactLabel,
  phoneLabel,
  emailLabel,
  dateLabel,
  fromLabel,
  toLabel,
  draft,
  errors,
  onChange,
}: {
  prefix: "pickup" | "delivery";
  companyLabel: string;
  locationLabel: string;
  contactLabel: string;
  phoneLabel: string;
  emailLabel: string;
  dateLabel: string;
  fromLabel: string;
  toLabel: string;
  draft: OrderDraft;
  errors: Record<string, string>;
  onChange: <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => void;
}) {
  const company = `${prefix}Company` as const;
  const location = `${prefix}Location` as const;
  const contact = `${prefix}ContactName` as const;
  const phone = `${prefix}Phone` as const;
  const email = `${prefix}Email` as const;
  const date = `${prefix}Date` as const;
  const from = `${prefix}TimeFrom` as const;
  const to = `${prefix}TimeTo` as const;
  return (
    <View>
      <Field label={companyLabel} value={draft[company]} onChangeText={(value) => onChange(company, value)} error={errors[company] ?? null} autoCapitalize="words" />
      <Field label={locationLabel} value={draft[location]} onChangeText={(value) => onChange(location, value)} error={errors[location] ?? null} autoCapitalize="sentences" />
      <Field label={contactLabel} value={draft[contact]} onChangeText={(value) => onChange(contact, value)} error={errors[contact] ?? null} autoCapitalize="words" />
      <Field label={phoneLabel} value={draft[phone]} onChangeText={(value) => onChange(phone, value)} error={errors[phone] ?? null} keyboardType="phone-pad" />
      <Field label={`${emailLabel} (không bắt buộc)`} value={draft[email]} onChangeText={(value) => onChange(email, value)} error={errors[email] ?? null} keyboardType="email-address" autoComplete="email" />
      <Field label={`${dateLabel} (năm-tháng-ngày)`} value={draft[date]} onChangeText={(value) => onChange(date, value)} error={errors[date] ?? null} placeholder="2026-10-30" keyboardType="numbers-and-punctuation" maxLength={10} />
      <Field label={`${fromLabel} (giờ:phút)`} value={draft[from]} onChangeText={(value) => onChange(from, value)} error={errors[from] ?? null} placeholder="08:00" keyboardType="numbers-and-punctuation" maxLength={5} />
      <Field label={`${toLabel} (giờ:phút)`} value={draft[to]} onChangeText={(value) => onChange(to, value)} error={errors[to] ?? null} placeholder="11:00" keyboardType="numbers-and-punctuation" maxLength={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.lg, paddingBottom: 96 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 1.1 },
  progress: { marginTop: space.md, flexDirection: "row", gap: space.sm },
  progressSegment: { flex: 1, height: 4, borderRadius: 999 },
  title: { marginTop: space.md, fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 36 },
  lede: { marginTop: space.sm, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
  groupLabel: { marginTop: space.lg, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  actions: { marginTop: space.xl, flexDirection: "row", alignItems: "center", gap: space.md },
  back: { minHeight: 52, paddingHorizontal: space.lg, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  grow: { flex: 1 },
});

import { useState, type ReactNode } from "react";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChoiceChip } from "../../components/common/Feedback";
import { DateTimeWheelFields } from "../../components/common/DateTimeWheelFields";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { panelChrome, radius, space, useTheme, type Palette } from "../../constants/theme";
import { emptyDraft, stepFields, validateOrder, type OrderDraft } from "../../features/shipments/validateOrder";
import { ApiError } from "../../services/api/client";
import { createShipment } from "../../services/api/shipments";
import { uploadCargoImage } from "../../services/api/operations";
import { temperatureGroups, type TemperatureGroup } from "../../types/shipment";

const temperatureCopy: Record<TemperatureGroup, string> = {
  COOL: "Lạnh mát",
  FROZEN: "Đông",
  DEEP_FROZEN: "Cực lạnh",
};

const stepTitle = ["Điểm bốc hàng", "Điểm giao hàng", "Hàng hóa và cước"] as const;

const stepMeta = [
  { short: "Bốc hàng", icon: "warehouse" as const, hint: "Kho lấy hàng và liên hệ bốc" },
  { short: "Giao hàng", icon: "map-marker-check" as const, hint: "Điểm giao và người nhận" },
  { short: "Hàng & cước", icon: "package-variant-closed" as const, hint: "Mô tả, nhiệt độ, giá niêm yết" },
] as const;

export function CreateOrderScreen({ onCreated }: { onCreated: (id: string) => void }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [imageNote, setImageNote] = useState<string | null>(null);

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
    if (imageIds.length < 1 || imageIds.length > 5) {
      show({}, 3, "Thêm từ 1 đến 5 ảnh hàng hóa.");
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const created = await createShipment({ ...result.body, cargoImageIds: imageIds });
      setDraft(emptyDraft);
      setImageIds([]);
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
  const meta = stepMeta[step - 1];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <View style={[styles.hero, { backgroundColor: colors.brand }]}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.heroKicker, { color: colors.onPrimaryMuted }]}>
            Tạo đơn · Bước {step}/3
          </Text>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.25} style={[styles.heroTitle, { color: colors.onPrimary }]}>
            {stepTitle[step - 1]}
          </Text>
          <Text maxFontSizeMultiplier={1.35} style={[styles.heroLede, { color: colors.onPrimaryMuted }]}>
            {meta.hint}. Đơn lên sàn ở trạng thái Đang tìm xe.
          </Text>
          <View style={styles.stepRow}>
            {stepMeta.map((item, index) => {
              const n = (index + 1) as 1 | 2 | 3;
              const active = n === step;
              const done = n < step;
              return (
                <View
                  key={item.short}
                  style={[
                    styles.stepPill,
                    {
                      backgroundColor: active ? colors.surface : "rgba(255,255,255,0.12)",
                      borderColor: active ? colors.surface : "transparent",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={done ? "check-circle" : item.icon}
                    size={16}
                    color={active ? colors.primary : colors.onPrimaryMuted}
                  />
                  <Text
                    maxFontSizeMultiplier={1.1}
                    style={[
                      styles.stepPillText,
                      { color: active ? colors.primary : colors.onPrimaryMuted, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium" },
                    ]}
                  >
                    {item.short}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {formError ? (
          <View accessibilityRole="alert" style={styles.alertPad}>
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
          <View style={styles.formStack}>
            <FormSection title="Mô tả hàng" icon="clipboard-text-outline" colors={colors}>
              <Field
                compact
                label="Mô tả hàng hóa"
                value={draft.cargoDescription}
                onChangeText={(value) => set("cargoDescription", value)}
                error={shown.cargoDescription ?? null}
                autoCapitalize="sentences"
                multiline
                maxLength={300}
              />
              <Text style={[styles.groupLabel, { color: colors.ink }]}>Nhóm nhiệt</Text>
              <View style={styles.chips}>
                {temperatureGroups.map((group) => (
                  <ChoiceChip key={group} label={temperatureCopy[group]} selected={draft.temperatureGroup === group} onPress={() => set("temperatureGroup", group)} />
                ))}
              </View>
              <FieldError message={shown.temperatureGroup ?? null} />
            </FormSection>
            <FormSection title="Khối lượng & xe" icon="truck-outline" colors={colors}>
              <Field compact label="Trọng lượng (tấn)" value={draft.cargoWeightTon} onChangeText={(value) => set("cargoWeightTon", value)} error={shown.cargoWeightTon ?? null} keyboardType="decimal-pad" placeholder="1.5" />
              <Field compact label="Thể tích (m³)" value={draft.cargoVolumeM3} onChangeText={(value) => set("cargoVolumeM3", value)} error={shown.cargoVolumeM3 ?? null} keyboardType="decimal-pad" placeholder="8" />
              <Field compact label="Số thùng" value={draft.packageCount} onChangeText={(value) => set("packageCount", value.replace(/\D/g, ""))} error={shown.packageCount ?? null} keyboardType="number-pad" />
              <Field compact label="Yêu cầu xe" value={draft.vehicleRequirement} onChangeText={(value) => set("vehicleRequirement", value)} error={shown.vehicleRequirement ?? null} autoCapitalize="sentences" maxLength={160} />
            </FormSection>
            <FormSection title="Cước & ảnh" icon="cash-multiple" colors={colors}>
              <Field compact label="Cước niêm yết (đồng)" value={draft.listedPriceVnd} onChangeText={(value) => set("listedPriceVnd", value.replace(/\D/g, ""))} error={shown.listedPriceVnd ?? null} keyboardType="number-pad" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn ảnh hàng hóa"
                onPress={() => void pickCargoImages(setImageIds, setImageNote)}
                style={[styles.upload, pointer, { borderColor: colors.line, backgroundColor: colors.field }]}
              >
                <MaterialCommunityIcons name="camera-plus-outline" size={22} color={colors.primary} />
                <Text style={[styles.uploadText, { color: colors.ink }]}>Chọn 1 đến 5 ảnh hàng</Text>
              </Pressable>
              <Text style={[styles.uploadNote, { color: imageNote ? colors.danger : colors.muted }]}>
                {imageNote ?? `Đã chọn ${imageIds.length} ảnh.`}
              </Text>
            </FormSection>
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

async function pickCargoImages(setIds: (ids: string[]) => void, setNote: (note: string | null) => void) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    setNote("Chưa được phép đọc ảnh trên máy.");
    return;
  }
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.7 });
  if (picked.canceled) return;
  try {
    const ids: string[] = [];
    for (const asset of picked.assets.slice(0, 5)) {
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const type = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
      ids.push(await uploadCargoImage(bytes, type));
    }
    setIds(ids);
    setNote(null);
  } catch (error) {
    setNote(error instanceof Error ? error.message : "Không tải được ảnh.");
  }
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
  const { colors } = useTheme();
  const company = `${prefix}Company` as const;
  const location = `${prefix}Location` as const;
  const contact = `${prefix}ContactName` as const;
  const phone = `${prefix}Phone` as const;
  const email = `${prefix}Email` as const;
  const date = `${prefix}Date` as const;
  const from = `${prefix}TimeFrom` as const;
  const to = `${prefix}TimeTo` as const;
  return (
    <View style={styles.formStack}>
      <FormSection title="Kho & địa chỉ" icon="map-marker-radius" colors={colors}>
        <Field compact label={companyLabel} value={draft[company]} onChangeText={(value) => onChange(company, value)} error={errors[company] ?? null} autoCapitalize="words" />
        <Field compact label={locationLabel} value={draft[location]} onChangeText={(value) => onChange(location, value)} error={errors[location] ?? null} autoCapitalize="sentences" />
      </FormSection>
      <FormSection title="Liên hệ" icon="account-outline" colors={colors}>
        <Field compact label={contactLabel} value={draft[contact]} onChangeText={(value) => onChange(contact, value)} error={errors[contact] ?? null} autoCapitalize="words" />
        <Field compact label={phoneLabel} value={draft[phone]} onChangeText={(value) => onChange(phone, value)} error={errors[phone] ?? null} keyboardType="phone-pad" />
        <Field
          compact
          label={`${emailLabel} (không bắt buộc)`}
          value={draft[email]}
          onChangeText={(value) => onChange(email, value)}
          error={errors[email] ?? null}
          keyboardType="email-address"
          autoComplete="email"
        />
      </FormSection>
      <FormSection title="Thời gian" icon="clock-outline" colors={colors}>
        <DateTimeWheelFields
          dateLabel={dateLabel}
          fromLabel={fromLabel}
          toLabel={toLabel}
          dateValue={draft[date]}
          fromValue={draft[from]}
          toValue={draft[to]}
          dateError={errors[date] ?? null}
          fromError={errors[from] ?? null}
          toError={errors[to] ?? null}
          onDateChange={(value) => onChange(date, value)}
          onFromChange={(value) => onChange(from, value)}
          onToChange={(value) => onChange(to, value)}
        />
      </FormSection>
    </View>
  );
}

function FormSection({
  title,
  icon,
  colors,
  children,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  colors: Palette;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, panelChrome(colors)]}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.badge }]}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: space.lg, paddingBottom: 96, flexGrow: 1 },
  hero: {
    marginHorizontal: -space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    marginBottom: space.lg,
  },
  heroKicker: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  heroTitle: { marginTop: space.sm, fontFamily: "Inter_700Bold", fontSize: 24, lineHeight: 32 },
  heroLede: { marginTop: space.sm, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  stepRow: { flexDirection: "row", gap: space.sm, marginTop: space.lg, flexWrap: "wrap" },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  stepPillText: { fontSize: 12, lineHeight: 16 },
  alertPad: { marginBottom: space.md },
  formStack: { gap: space.md },
  section: { padding: space.lg, gap: 0 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  groupLabel: { marginTop: space.md, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  upload: {
    marginTop: space.md,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.control,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  uploadText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  uploadNote: { marginTop: space.sm, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  actions: { marginTop: space.xl, flexDirection: "row", alignItems: "center", gap: space.md },
  back: { minHeight: 52, paddingHorizontal: space.lg, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  grow: { flex: 1 },
});

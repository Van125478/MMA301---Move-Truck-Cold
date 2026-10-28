import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CargoImagePicker } from "../../components/shipment/CargoImagePicker";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { TemperatureGroupField } from "../../components/shipment/TemperatureGroupField";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
import { CARGO_IMAGE_MAX } from "../../features/shipments/shipmentDraftValidation";
import { useCreateShipmentForm } from "../../features/shipments/useCreateShipmentForm";
import type { RootStackParamList } from "../../navigation/types";

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>;
}

export function CreateShipmentScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const form = useCreateShipmentForm();

  async function submit() {
    const shipment = await form.submit();
    if (shipment) {
      navigation.replace("ShipmentDetail", { id: shipment.id });
    }
  }

  async function handlePickImage() {
    const error = await form.pickImage();
    if (error) form.markTouched("cargoImageIds");
    void error;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.ink }]}>
            Đăng đơn mới
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Nhập đủ thông tin để nhà xe thấy và nhận chuyến.</Text>

          {form.submitError ? (
            <View accessibilityRole="alert" style={styles.alert}>
              <FieldError message={form.submitError} />
            </View>
          ) : null}

          <View style={[styles.card, panelChrome(colors)]}>
            <SectionTitle title="Hàng hóa" />
            <Field
              label="Mô tả hàng hóa"
              value={form.draft.cargoDescription}
              onChangeText={(value) => form.setField("cargoDescription", value)}
              onSubmitEditing={() => form.markTouched("cargoDescription")}
              error={form.visibleError("cargoDescription")}
              placeholder="Ví dụ: Xoài cát Hòa Lộc, 2.5 tấn"
              maxLength={300}
            />
            <TemperatureGroupField
              value={form.draft.temperatureGroup}
              onChange={(value) => form.setField("temperatureGroup", value)}
              error={form.visibleError("temperatureGroup")}
            />
            <Field
              label="Trọng lượng (tấn)"
              value={form.draft.cargoWeightTon}
              onChangeText={(value) => form.setField("cargoWeightTon", value)}
              onSubmitEditing={() => form.markTouched("cargoWeightTon")}
              error={form.visibleError("cargoWeightTon")}
              placeholder="2.5"
              keyboardType="decimal-pad"
              maxLength={10}
            />
            <Field
              label="Thể tích (m³)"
              value={form.draft.cargoVolumeM3}
              onChangeText={(value) => form.setField("cargoVolumeM3", value)}
              onSubmitEditing={() => form.markTouched("cargoVolumeM3")}
              error={form.visibleError("cargoVolumeM3")}
              placeholder="12"
              keyboardType="decimal-pad"
              maxLength={10}
            />
            <Field
              label="Số thùng/kiện"
              value={form.draft.packageCount}
              onChangeText={(value) => form.setField("packageCount", value)}
              onSubmitEditing={() => form.markTouched("packageCount")}
              error={form.visibleError("packageCount")}
              placeholder="180"
              keyboardType="number-pad"
              maxLength={7}
            />
            <Field
              label="Yêu cầu xe"
              value={form.draft.vehicleRequirement}
              onChangeText={(value) => form.setField("vehicleRequirement", value)}
              onSubmitEditing={() => form.markTouched("vehicleRequirement")}
              error={form.visibleError("vehicleRequirement")}
              placeholder="Xe lạnh 5 tấn"
              maxLength={160}
            />
            <Field
              label="Giá cước niêm yết (đ)"
              value={form.draft.listedPriceVnd}
              onChangeText={(value) => form.setField("listedPriceVnd", value)}
              onSubmitEditing={() => form.markTouched("listedPriceVnd")}
              error={form.visibleError("listedPriceVnd")}
              placeholder="4500000"
              keyboardType="number-pad"
              maxLength={12}
            />
            <View style={styles.imageBlock}>
              <Text style={[styles.label, { color: colors.ink }]}>Ảnh hàng hóa</Text>
              <CargoImagePicker
                images={form.images}
                max={CARGO_IMAGE_MAX}
                onPick={() => void handlePickImage()}
                onRemove={form.removeImage}
                error={form.visibleError("cargoImageIds")}
              />
            </View>
          </View>

          <View style={[styles.card, panelChrome(colors)]}>
            <SectionTitle title="Lấy hàng" />
            <Field
              label="Công ty / kho gửi"
              value={form.draft.pickupCompany}
              onChangeText={(value) => form.setField("pickupCompany", value)}
              onSubmitEditing={() => form.markTouched("pickupCompany")}
              error={form.visibleError("pickupCompany")}
              maxLength={160}
            />
            <Field
              label="Địa chỉ lấy hàng"
              value={form.draft.pickupLocation}
              onChangeText={(value) => form.setField("pickupLocation", value)}
              onSubmitEditing={() => form.markTouched("pickupLocation")}
              error={form.visibleError("pickupLocation")}
              maxLength={300}
            />
            <Field
              label="Người bốc hàng"
              value={form.draft.pickupContactName}
              onChangeText={(value) => form.setField("pickupContactName", value)}
              onSubmitEditing={() => form.markTouched("pickupContactName")}
              error={form.visibleError("pickupContactName")}
              maxLength={160}
            />
            <Field
              label="Số điện thoại"
              value={form.draft.pickupPhone}
              onChangeText={(value) => form.setField("pickupPhone", value)}
              onSubmitEditing={() => form.markTouched("pickupPhone")}
              error={form.visibleError("pickupPhone")}
              keyboardType="phone-pad"
              maxLength={20}
            />
            <Field
              label="Email nhận thông báo (không bắt buộc)"
              value={form.draft.pickupEmail}
              onChangeText={(value) => form.setField("pickupEmail", value)}
              onSubmitEditing={() => form.markTouched("pickupEmail")}
              error={form.visibleError("pickupEmail")}
              keyboardType="email-address"
              maxLength={160}
            />
            <Field
              label="Ngày lấy hàng (YYYY-MM-DD)"
              value={form.draft.pickupDate}
              onChangeText={(value) => form.setField("pickupDate", value)}
              onSubmitEditing={() => form.markTouched("pickupDate")}
              error={form.visibleError("pickupDate")}
              placeholder="2026-12-01"
              maxLength={10}
            />
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Field
                  label="Giờ bắt đầu"
                  value={form.draft.pickupTimeFrom}
                  onChangeText={(value) => form.setField("pickupTimeFrom", value)}
                  onSubmitEditing={() => form.markTouched("pickupTimeFrom")}
                  error={form.visibleError("pickupTimeFrom")}
                  placeholder="08:00"
                  maxLength={5}
                />
              </View>
              <View style={styles.timeField}>
                <Field
                  label="Giờ kết thúc"
                  value={form.draft.pickupTimeTo}
                  onChangeText={(value) => form.setField("pickupTimeTo", value)}
                  onSubmitEditing={() => form.markTouched("pickupTimeTo")}
                  error={form.visibleError("pickupTimeTo")}
                  placeholder="11:30"
                  maxLength={5}
                />
              </View>
            </View>
          </View>

          <View style={[styles.card, panelChrome(colors)]}>
            <SectionTitle title="Giao hàng" />
            <Field
              label="Công ty / kho nhận"
              value={form.draft.deliveryCompany}
              onChangeText={(value) => form.setField("deliveryCompany", value)}
              onSubmitEditing={() => form.markTouched("deliveryCompany")}
              error={form.visibleError("deliveryCompany")}
              maxLength={160}
            />
            <Field
              label="Địa chỉ giao hàng"
              value={form.draft.deliveryLocation}
              onChangeText={(value) => form.setField("deliveryLocation", value)}
              onSubmitEditing={() => form.markTouched("deliveryLocation")}
              error={form.visibleError("deliveryLocation")}
              maxLength={300}
            />
            <Field
              label="Người nhận hàng"
              value={form.draft.deliveryContactName}
              onChangeText={(value) => form.setField("deliveryContactName", value)}
              onSubmitEditing={() => form.markTouched("deliveryContactName")}
              error={form.visibleError("deliveryContactName")}
              maxLength={160}
            />
            <Field
              label="Số điện thoại"
              value={form.draft.deliveryPhone}
              onChangeText={(value) => form.setField("deliveryPhone", value)}
              onSubmitEditing={() => form.markTouched("deliveryPhone")}
              error={form.visibleError("deliveryPhone")}
              keyboardType="phone-pad"
              maxLength={20}
            />
            <Field
              label="Email kho nhận (không bắt buộc)"
              value={form.draft.deliveryEmail}
              onChangeText={(value) => form.setField("deliveryEmail", value)}
              onSubmitEditing={() => form.markTouched("deliveryEmail")}
              error={form.visibleError("deliveryEmail")}
              keyboardType="email-address"
              maxLength={160}
            />
            <Field
              label="Ngày giao hàng (YYYY-MM-DD)"
              value={form.draft.deliveryDate}
              onChangeText={(value) => form.setField("deliveryDate", value)}
              onSubmitEditing={() => form.markTouched("deliveryDate")}
              error={form.visibleError("deliveryDate")}
              placeholder="2026-12-02"
              maxLength={10}
            />
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Field
                  label="Giờ bắt đầu"
                  value={form.draft.deliveryTimeFrom}
                  onChangeText={(value) => form.setField("deliveryTimeFrom", value)}
                  onSubmitEditing={() => form.markTouched("deliveryTimeFrom")}
                  error={form.visibleError("deliveryTimeFrom")}
                  placeholder="14:00"
                  maxLength={5}
                />
              </View>
              <View style={styles.timeField}>
                <Field
                  label="Giờ kết thúc"
                  value={form.draft.deliveryTimeTo}
                  onChangeText={(value) => form.setField("deliveryTimeTo", value)}
                  onSubmitEditing={() => form.markTouched("deliveryTimeTo")}
                  error={form.visibleError("deliveryTimeTo")}
                  placeholder="18:00"
                  maxLength={5}
                />
              </View>
            </View>
          </View>

          <PrimaryButton label="Đăng đơn" pendingLabel="Đang đăng…" onPress={() => void submit()} pending={form.submitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxl },
  title: { ...textType.display },
  subtitle: { ...textType.body, marginTop: space.sm, marginBottom: space.lg },
  alert: { marginBottom: space.lg },
  card: { padding: space.lg, marginBottom: space.lg },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 20, marginBottom: space.sm },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20, marginBottom: space.sm },
  imageBlock: { marginTop: space.lg },
  timeRow: { flexDirection: "row", gap: space.md },
  timeField: { flex: 1 },
});

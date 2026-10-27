# Kịch bản demo

Mở app ở `http://127.0.0.1:5173` khi API đã chạy. Mật khẩu demo lấy trong `server/.env`, không gõ tên biến.

Trên database `coldi_demo_local`, chuẩn bị dữ liệu:

```powershell
cd server
$env:DEMO_CREDENTIAL_SYNC_DATABASE="coldi_demo_local"
npm run seed:demo
npm run seed:fleet
npm run seed:shipments
```

## 1. Trang trước đăng nhập

1. Tab **Khám phá** hiện đơn đang tìm xe từ máy chủ. Dòng **Giá cao đến thấp**. Chip **Tất cả**, **Lạnh mát**, **Đông**, **Cực lạnh**.
2. Ô tìm lọc theo hàng, điểm lấy, điểm giao.
3. Bấm chuông: màn **Thông báo** yêu cầu đăng nhập.
4. Bấm một thẻ hoặc **Đăng nhập để đăng đơn** để vào form.

## 2. Chủ hàng

1. Đăng nhập `shipper.demo@coldi.local`.
2. Thanh trên là **Coldi** và chuông. Tab **Tài khoản** hiện **Chủ hàng** và email.
3. Tab **Đơn hàng** có khối **Đơn đang tìm xe** (cùng sàn với trang Khám phá) và **Đơn của bạn**. Cả hai xếp giá cao đến thấp và lọc được nhóm nhiệt.
4. Tab **Tạo đơn**: ba bước. Ngày dạng `2026-11-02`, giờ dạng `08:00` và `11:00`. Cước là số nguyên đồng.
5. Bấm **Đăng đơn**. App mở chi tiết đơn vừa tạo, trạng thái **Đang tìm xe**.
6. Chuông có dòng **Đăng đơn thành công**. Bấm dòng đó mở lại đúng đơn.
7. Bấm trái tim. Sang tab **Yêu thích**, đơn đó có một dòng. **Xóa tất cả yêu thích** làm trống danh sách sau khi xác nhận.
8. Trên chi tiết, bấm **Hủy đơn đang tìm xe** khi đơn còn đang tìm xe.
9. Mở đơn **Sữa chua lạnh đã giao** nếu đã seed. Khối **Đánh giá** có sao, nhóm theo số sao, và nhận xét.

## 3. Nhà xe

1. Đăng xuất, đăng nhập `carrier.demo@coldi.local`.
2. Tab **Sàn chuyến** chỉ có đơn đang tìm xe, giá cao trước.
3. Mở một đơn, bấm **Nhận chuyến**, xác nhận.
4. Tab **Đã nhận**, mở chuyến đó. Chọn xe đang rảnh và tài xế, bấm **Phân công**.
5. Chuông của nhà xe có **Bạn đã nhận chuyến**. Chuông chủ hàng có **Đơn đã được nhận**. Bấm dòng mở đúng đơn.

## 4. Tài xế

1. Đăng nhập `driver.demo@coldi.local`.
2. Tab **Chuyến** có chuyến đã được giao. Chuông có **Bạn được giao chuyến**.
3. Mở chuyến đang chờ lấy, bấm **Xác nhận đã lấy hàng**.
4. Khi trạng thái là **Đang vận chuyển**, bấm **Gửi vị trí GPS** và cho phép định vị. Chủ hàng mở cùng đơn thấy tọa độ ở **Vị trí xe**.
5. Bấm **Xác nhận đã giao hàng**. Sau đó chủ hàng có thể gửi đánh giá nếu đơn chưa có nhận xét.

## Chưa làm

- Sửa đơn: chưa có API sửa.
- Hủy sau khi nhà xe đã nhận: máy chủ từ chối, app không mở nút.
- Bản đồ, chọn ảnh, Gemini: không nằm trong phạm vi app này. GPS là tọa độ, không phải bản đồ.
- Quản trị: chưa có khu vận hành trên app.
- Yêu thích không đồng bộ sang máy khác.

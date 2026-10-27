# Coldi mobile

App Expo cho vận tải lạnh: trang trước đăng nhập, đăng nhập, và khu làm việc theo vai.

Cách tự bấm nghiệm thu nằm ở [NGHIEM_THU.md](NGHIEM_THU.md). Kịch bản demo nằm ở [DEMO.md](DEMO.md).

## Cài và chạy

Cần Node.js 22 trở lên. Expo SDK 58 không chạy ổn trên Node 20.

```powershell
cd mobile
Copy-Item .env.example .env
npm install
npm start
```

`EXPO_PUBLIC_API_ORIGIN` là địa chỉ API, không phải mật khẩu. Git không nhận file `.env`.

| Máy chạy app | Giá trị |
| --- | --- |
| Máy tính, Expo web, máy ảo iOS | `http://127.0.0.1:4000` |
| Máy ảo Android | `http://10.0.2.2:4000` |
| Điện thoại thật | `http://<IP máy chạy API>:4000` |

API phải đang chạy và MongoDB đã nối. Xem [README.md](../README.md) ở gốc kho. Sau khi đổi `.env`, tắt rồi chạy lại `npm start`.

## Đăng nhập

- `POST /api/auth/register` với `{ "email", "password", "displayName", "role" }`. `role` chỉ nhận `SHIPPER` hoặc `CARRIER`.
- `POST /api/auth/login` với `{ "email", "password" }`. `email` cũng nhận tên đăng nhập của tài xế.
- `GET /api/auth/me` để khôi phục phiên.
- `POST /api/auth/logout` để đăng xuất.
- `POST /api/auth/change-required-password` với `{ "newPassword" }` khi tài khoản còn mật khẩu tạm.
- `POST /api/auth/forgot-password` rồi `POST /api/auth/reset-password`. Máy local hiện mã trên app, không gửi email.

Phiên là cookie `coldi_session`. Trên điện thoại, app giữ cookie trong Secure Store. Không lưu mật khẩu. Ô ghi nhớ chỉ giữ email hoặc tên đăng nhập.

## Trang và tab

Trước đăng nhập: tab **Khám phá**, **Đăng nhập**, **Đăng ký**. Khám phá gọi `GET /api/marketplace/shipments`, lọc nhóm nhiệt, và xếp giá cao đến thấp.

Sau đăng nhập, thanh trên là logo **Coldi** và chuông **Thông báo**.

| Vai | Tab | Việc app làm |
| --- | --- | --- |
| Chủ hàng | Đơn hàng, Tạo đơn, Yêu thích, Tài khoản | Đơn của mình, sàn đang tìm xe, tạo đơn, hủy đơn còn đang tìm xe, đánh giá sau khi đã giao |
| Nhà xe | Sàn chuyến, Đã nhận, Yêu thích, Tài khoản | Xem đơn đang tìm xe, nhận chuyến, phân công xe và tài xế |
| Tài xế | Chuyến, Yêu thích, Tài khoản | Chuyến được giao, xác nhận lấy, xác nhận giao, gửi GPS khi đang vận chuyển |
| Quản trị | Tài khoản | Chưa có khu vận hành trên app |

Yêu thích lưu bằng AsyncStorage theo tài khoản trên máy. Thêm hoặc bỏ từ danh sách và từ chi tiết. Mỗi mã một lần. Tab Yêu thích xóa một mục hoặc xóa tất cả.

Chuông mở màn **Thông báo**. Đăng đơn thành công, đơn được nhận, được giao chuyến, và sự cố đều nằm ở đó. Bấm một dòng mở đúng đơn.

## API app đang gọi

| Việc | Đường |
| --- | --- |
| Sàn công khai | `GET /api/marketplace/shipments` |
| Đơn của chủ hàng | `GET /api/shipments/mine`, `GET /api/shipments/:id`, `POST /api/shipments`, `POST /api/shipments/:id/cancel` |
| Nhà xe | `GET /api/carrier/shipments`, `POST .../claim`, `GET .../claimed`, `POST .../assign` |
| Tài xế | `GET /api/driver/shipments`, `POST .../pickup`, `POST .../delivery`, `GET` và `POST .../location` |
| Đánh giá | `GET /api/shipment-reviews/:id`, `POST /api/mobile/shipments/:id/reviews` |
| Thông báo đơn và sự cố | `GET /api/notices`, `GET /api/notices/unread-count`, `POST /api/notices/:id/read` |

Hủy sau khi nhà xe đã nhận chưa mở. Sửa đơn chưa có API. Quản trị chưa có khu vận hành trên app.

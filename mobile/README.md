# Coldi mobile

App Expo cho vận tải lạnh. Phần này là nền tảng của thành viên 1: cấu hình, gọi API, đăng nhập, giữ phiên và vào đúng vai.

Màn danh sách đơn, nhận chuyến, tài xế và yêu thích để các thành viên khác gắn vào `src/screens` và `src/features`.

Cách tự bấm nghiệm thu nằm ở [NGHIEM_THU.md](NGHIEM_THU.md).

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

App gọi đúng API đang có:

- `POST /api/auth/login` với `{ "email", "password" }`. `email` cũng nhận tên đăng nhập của tài xế.
- `GET /api/auth/me` để khôi phục phiên.
- `POST /api/auth/logout` để đăng xuất.
- `POST /api/auth/change-required-password` với `{ "newPassword" }` khi tài khoản còn mật khẩu tạm.

Phiên là cookie `coldi_session`, hết hạn sau 12 giờ. Trên điện thoại, app đọc cookie đó và giữ trong Secure Store. Không lưu mật khẩu. Ô ghi nhớ đăng nhập chỉ giữ email hoặc tên đăng nhập.

Máy chủ không có đăng ký và không có quên mật khẩu. Hai dòng đó trên màn hình mở một trang nói rõ điều này, không giả lập thành công.

Sai mật khẩu hiện đúng câu của máy chủ. Mất mạng hiện "Không kết nối được máy chủ". Phiên hết hạn thì lần mở app sau quay về màn đăng nhập.

Sau khi đăng nhập, app đọc `role` từ máy chủ và mở màn của vai đó: chủ hàng, nhà xe, tài xế, hoặc quản trị. Quản trị chưa có khu vận hành trên app.

## Giao diện

Màn đăng nhập theo ảnh mobile trong bộ thiết kế Coldi: thẻ trắng, nhãn trên ô nhập, nút navy. Chữ dùng Inter. Màu lấy từ thương hiệu Coldi (`#1E3A8A` trên nền `#F8FAFC`), kể cả khi bảng gợi ý logistics có nút cam. Nút bấm cao ít nhất 48. Lỗi nằm dưới ô và được đọc lại. App có cả nền sáng và nền tối.

## Thư mục

| Đường dẫn | Việc để ở đây |
| --- | --- |
| `App.tsx` | Nạp chữ, rồi gắn phiên và điều hướng. |
| `src/navigation` | Stack đăng nhập và màn theo vai. |
| `src/screens/auth` | Đăng nhập, đổi mật khẩu tạm, trang chưa có API. |
| `src/screens/home` | Màn đầu sau đăng nhập. Thành viên đơn và chuyến gắn tiếp từ đây. |
| `src/services/api` | Hàm gọi API. Không gọi `fetch` trong màn hình. |
| `src/features/auth` | Trạng thái phiên. |
| `src/components` | Ô nhập, nút, lỗi. |
| `src/constants` | Địa chỉ API và màu. |

`ios/` và `android/` không commit. Expo tạo hai thư mục đó khi build.

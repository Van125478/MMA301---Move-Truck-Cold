# Nghiệm thu phần thành viên 1

Làm trên máy này. MongoDB đang cài sẵn, không cần Docker. Mật khẩu nằm trong `server\.env`, file này không ghi mật khẩu.

Đạt khi bốn tài khoản demo vào được đúng vai, sai mật khẩu có câu lỗi, đăng xuất rồi mở lại thì về màn đăng nhập, và tải lại trang khi còn phiên thì không phải đăng nhập lại.

## 1. Bật API

Mở một cửa sổ terminal:

```powershell
cd C:\Coldi-Development\server
npm run dev
```

Đợi hai dòng:

```text
MongoDB connected.
COLDI API listening on port 4000.
```

Kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

`database` phải là `connected`. Giữ cửa sổ này mở.

## 2. Bật app

Mở cửa sổ terminal thứ hai:

```powershell
cd C:\Coldi-Development\mobile
npm install
npx expo start --web --port 5173 --host lan
```

Nếu Windows hỏi tường lửa, chọn mạng riêng. Mở đúng địa chỉ `http://127.0.0.1:5173`.

Đừng mở `http://localhost:5173`. Hai địa chỉ đó khác nhau. API chỉ nhận nguồn `http://127.0.0.1:5173`, đúng giá trị `FRONTEND_ORIGIN` trong `server\.env`.

Expo có thể cảnh báo Node 20. App vẫn mở được. Nếu lệnh dừng hẳn, cài Node.js 22 rồi chạy lại.

## 3. Tài khoản

Lấy mật khẩu trong `server\.env`. Mỗi biến `DEMO_*_PASSWORD` đi với email cùng hàng.

| Email | Biến mật khẩu | Màn sau khi vào |
| --- | --- | --- |
| `shipper.demo@coldi.local` | `DEMO_SHIPPER_PASSWORD` | Chủ hàng, dòng `Máy chủ trả vai: SHIPPER` |
| `carrier.demo@coldi.local` | `DEMO_CARRIER_PASSWORD` | Nhà xe, dòng `Máy chủ trả vai: CARRIER` |
| `driver.demo@coldi.local` | `DEMO_DRIVER_PASSWORD` | Tài xế, dòng `Máy chủ trả vai: DRIVER` |
| `admin.demo@coldi.local` | `DEMO_ADMIN_PASSWORD` | Quản trị, dòng `Máy chủ trả vai: ADMIN` |

## 4. Bấm theo thứ tự

Với từng tài khoản ở bảng trên:

1. Ở màn **Chào mừng trở lại**, nhập email và mật khẩu đúng.
2. Bấm **Đăng nhập**. Nút đổi thành **Đang đăng nhập…**
3. Màn sau đó hiện đúng vai trong bảng. Dòng `Máy chủ trả vai:` phải đúng chữ vai, không phải tên tự gõ.
4. Bấm **Đăng xuất**. Phải về màn **Chào mừng trở lại**.

Sau tài khoản chủ hàng, làm thêm bốn bước này:

1. Nhập đúng email chủ hàng, mật khẩu gõ `sai-mat-khau`, bấm **Đăng nhập**. Phải thấy câu `Email, tên đăng nhập hoặc mật khẩu không đúng.` Ô mật khẩu vẫn trống ý nghĩa là chưa vào được.
2. Xóa hết hai ô, bấm **Đăng nhập**. Phải thấy `Còn ô chưa nhập.` và dòng đỏ dưới từng ô.
3. Bấm **Quên mật khẩu?** Phải thấy `Chưa có quên mật khẩu trên máy chủ`. Bấm **Quay lại đăng nhập**.
4. Bấm **Đăng ký**. Phải thấy `Chưa có đăng ký trên máy chủ`. Bấm **Quay lại đăng nhập**.

Phiên còn sống:

1. Đăng nhập chủ hàng.
2. Tải lại trang `http://127.0.0.1:5173`. Vẫn thấy **Chủ hàng** và `SHIPPER`, không thấy form đăng nhập.
3. Bấm **Đăng xuất**, rồi tải lại trang. Phải thấy form đăng nhập.

Ghi nhớ đăng nhập không lưu mật khẩu:

1. Tick **Ghi nhớ đăng nhập**, đăng nhập chủ hàng, rồi đăng xuất.
2. Ô email còn `shipper.demo@coldi.local`. Ô mật khẩu trống.

## 5. Điện thoại, nếu cần xem trên máy thật

Cùng mạng Wi-Fi với máy tính. Trong `mobile\.env`:

```text
EXPO_PUBLIC_API_ORIGIN=http://<IPv4 máy tính>:4000
```

Xem IPv4 bằng `ipconfig`. Tắt Expo rồi chạy lại `npx expo start`. Quét mã bằng Expo Go. Windows Firewall phải cho cổng `4000`.

Trên điện thoại không mở bằng trình duyệt của máy tính. Các bước bấm ở mục 4 vẫn giống vậy. Tải lại trang đổi thành đóng hẳn app rồi mở lại.

## 6. Chưa tính là đạt

- Form báo `Không kết nối được máy chủ`: API chưa chạy, hoặc điện thoại đang trỏ `127.0.0.1` của chính điện thoại.
- Trình duyệt mở nhầm `localhost` rồi báo nguồn không được phép: đóng tab, mở `http://127.0.0.1:5173`.
- Vào được mà không có dòng `Máy chủ trả vai:`: đang mở bản app cũ. Tắt Expo và chạy lại.

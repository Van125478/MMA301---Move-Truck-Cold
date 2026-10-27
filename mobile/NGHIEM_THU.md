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

Lấy mật khẩu trong `server\.env`. Mỗi biến `DEMO_*_PASSWORD` đi với email cùng hàng. Gõ đúng giá trị sau dấu `=`. Đừng gõ tên biến, ví dụ đừng gõ chữ `DEMO_SHIPPER_PASSWORD` vào ô mật khẩu.

| Email | Biến mật khẩu | Tab Tài khoản |
| --- | --- | --- |
| `shipper.demo@coldi.local` | `DEMO_SHIPPER_PASSWORD` | Chủ hàng |
| `carrier.demo@coldi.local` | `DEMO_CARRIER_PASSWORD` | Nhà xe |
| `driver.demo@coldi.local` | `DEMO_DRIVER_PASSWORD` | Tài xế |
| `admin.demo@coldi.local` | `DEMO_ADMIN_PASSWORD` | Quản trị |

## 4. Bấm theo thứ tự

Với từng tài khoản ở bảng trên:

1. Ở màn đầu, dòng **Giải pháp · Chủ hàng**, bấm **Đăng nhập để đăng đơn**.
2. Ở màn **Chào mừng trở lại**, nhập email và mật khẩu đúng.
3. Bấm **Đăng nhập**. Nút đổi thành **Đang đăng nhập…**
4. Màn sau đó là khu làm việc. Thanh trên là **Coldi**. Tab **Tài khoản** hiện đúng vai trong bảng và đúng email, không hiện chữ `Máy chủ trả vai`.
5. Bấm **Đăng xuất**. Phải về trang **Giải pháp · Chủ hàng**.

Sau tài khoản chủ hàng, quay lại màn đăng nhập rồi làm thêm bốn bước này:

1. Ở trang **Giải pháp · Chủ hàng**, bấm **Đăng nhập để đăng đơn**. Nhập đúng email chủ hàng, mật khẩu gõ `sai-mat-khau`, bấm **Đăng nhập**. Phải thấy câu `Email, tên đăng nhập hoặc mật khẩu không đúng.`
2. Xóa hết hai ô, bấm **Đăng nhập**. Phải thấy `Còn ô chưa nhập.` và dòng đỏ dưới từng ô.
3. Bấm **Đăng ký**. Nhập tên hiển thị, chọn **Chủ hàng**, email chưa có trong hệ thống, mật khẩu từ 8 đến 72 ký tự. Bấm **Tạo tài khoản**. Tab **Tài khoản** phải là **Chủ hàng**. Bấm **Đăng xuất**, rồi đăng nhập lại bằng email vừa tạo. Tài xế không có lựa chọn tự đăng ký.
4. Vẫn dùng email vừa tạo, không dùng tài khoản demo chung. Ở màn đăng nhập, bấm **Quên mật khẩu?**, nhập email đó, bấm **Lấy mã đặt lại**. Mã hiện trên màn vì máy local chưa gửi email. Nhập mật khẩu mới từ 8 đến 72 ký tự, bấm **Đặt lại mật khẩu**, rồi **Quay lại đăng nhập**. Đăng nhập bằng mật khẩu mới phải vào được. Đăng nhập bằng mật khẩu cũ phải thấy câu sai mật khẩu.

Phiên còn sống:

1. Đăng nhập chủ hàng.
2. Tải lại trang `http://127.0.0.1:5173`. Vẫn ở khu làm việc, tab **Tài khoản** vẫn là **Chủ hàng**, không thấy form đăng nhập.
3. Vào tab **Tài khoản**, bấm **Đăng xuất**, rồi tải lại trang. Phải thấy trang giới thiệu chủ hàng.

Ghi nhớ đăng nhập không lưu mật khẩu:

1. Tick **Ghi nhớ đăng nhập**, đăng nhập chủ hàng, rồi đăng xuất.
2. Bấm **Đăng nhập để đăng đơn**. Ô email còn `shipper.demo@coldi.local`. Ô mật khẩu trống.

## 5. Máy ảo Android Studio

Bật máy ảo trong Device Manager trước. Máy ảo trong ảnh là Medium Phone, Android 17.

Trong `mobile\.env`:

```text
EXPO_PUBLIC_API_ORIGIN=http://10.0.2.2:4000
```

`10.0.2.2` là máy tính khi nhìn từ máy ảo. `127.0.0.1` trong máy ảo là chính máy ảo, nên API sẽ không tới.

API trên máy tính vẫn chạy ở cổng `4000`. Rồi:

```powershell
cd C:\Coldi-Development\mobile
npx expo start --android
```

Expo mở Coldi trên máy ảo đang chạy. Các bước bấm ở mục 4 vẫn giống vậy. Thay vì tải lại trang, đóng hẳn app rồi mở lại để kiểm tra phiên.

Android 17 chặn Expo Go gọi sang máy tính cho đến khi app được phép dùng mạng nội bộ. Expo Go hiện dòng `Local network access needed`. Bấm dòng đó và cho phép. Nếu dòng đó không còn, chạy một lần:

```powershell
adb shell pm grant host.exp.exponent android.permission.ACCESS_LOCAL_NETWORK
```

Rồi đóng Coldi và mở lại từ mục Coldi trong Expo Go. Quyền này đã được cấp trên máy ảo Medium Phone của máy này.

## 6. Điện thoại thật, nếu cần

Cùng mạng Wi-Fi với máy tính. Trong `mobile\.env`:

```text
EXPO_PUBLIC_API_ORIGIN=http://<IPv4 máy tính>:4000
```

Xem IPv4 bằng `ipconfig`. Tắt Expo rồi chạy lại `npx expo start`. Quét mã bằng Expo Go. Windows Firewall phải cho cổng `4000`.

Trên điện thoại không mở bằng trình duyệt của máy tính. Các bước bấm ở mục 4 vẫn giống vậy. Tải lại trang đổi thành đóng hẳn app rồi mở lại.

## 7. Chưa tính là đạt

- Form báo `Không kết nối được máy chủ`: API chưa chạy, máy ảo đang trỏ `127.0.0.1` thay vì `10.0.2.2`, hoặc Expo Go chưa được cấp quyền mạng nội bộ ở mục 5.
- Câu `Email, tên đăng nhập hoặc mật khẩu không đúng.` trong khi ô mật khẩu còn chữ `DEMO_SHIPPER_PASSWORD`: đó là tên biến. Mở `server\.env` và gõ giá trị.
- Trình duyệt mở nhầm `localhost` rồi báo nguồn không được phép: đóng tab, mở `http://127.0.0.1:5173`.
- Vào được mà thanh trên không có chữ **Coldi** và chuông: đang mở bản app cũ. Tắt Expo và chạy lại.

# Đưa API lên máy khác

Ảnh Docker nằm trong `server`. `docker compose up -d` trong thư mục đó vẫn chỉ bật MongoDB. API nằm ở profile `api`, không tự chạy cùng lệnh đó.

Cần Docker, và `AUTH_SECRET` ít nhất 32 ký tự. Đừng commit mật khẩu.

## Chạy API cạnh MongoDB trên máy này

Trong PowerShell, từ thư mục `server`:

```powershell
$env:AUTH_SECRET = "một chuỗi tự đặt, ít nhất 32 ký tự"
docker compose --profile api up -d --build
```

API nghe `http://127.0.0.1:4000`. MongoDB của compose nghe `127.0.0.1:27017`, database `move_truck`. Kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

`database` là `connected` thì đã nối. Tạo tài khoản demo từ máy host, trỏ đúng database đó:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/move_truck"
npm run seed:demo
npm run seed:fleet
```

`NODE_ENV` của profile này mặc định `development`, để cookie phiên dùng được trên `http://127.0.0.1:5173`. App mobile vẫn để `EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:4000` khi mở trên máy tính.

Tắt API và MongoDB, giữ dữ liệu: `docker compose --profile api stop`.

## Máy công khai có HTTPS

Đặt các biến sau trên host. `NODE_ENV=production` bật cookie `Secure` và chặn đăng nhập sai cùng một email hoặc tên đăng nhập quá 8 lần trong 15 phút.

| Biến | Giá trị |
| --- | --- |
| `PORT` | Cổng process, thường `4000` |
| `MONGODB_URI` | `mongodb://` hoặc `mongodb+srv://` |
| `FRONTEND_ORIGIN` | Đúng nguồn app, ví dụ `https://app.example.com` |
| `NODE_ENV` | `production` |
| `AUTH_SECRET` | Ít nhất 32 ký tự, chỉ trên host |

Ảnh build bằng `docker build -t coldi-api server` từ thư mục gốc kho, rồi chạy với năm biến trên. Production không bật kích hoạt gói demo và không bật mô phỏng hoa hồng. Ảnh hàng hóa trên production cần thêm `CARGO_IMAGE_DIR` trỏ thư mục tuyệt đối; không có thì đăng nhập vẫn chạy, tải ảnh thì từ chối.

GitHub Actions build ảnh `coldi-api:ci` trên mỗi push và pull request vào `main`. Workflow đó không đẩy ảnh lên registry.

# Move Truck Cold

Kho này dùng để làm backend và app mobile. Nhánh làm việc là `main`.

Người mới làm đúng thứ tự: lấy mã, nối MongoDB, chạy API, rồi mở app trong `mobile`.

## Thư mục

| Thư mục | Việc |
| --- | --- |
| `server` | API. Đăng nhập, đơn, và `/api/mobile` |
| `mobile` | App Expo. Màn hình mới để trong `mobile/src` |

## 1. Lấy mã

Cần Git, Node.js `>= 20.19.0`, và npm.

```powershell
git clone https://github.com/Van125478/MMA301---Move-Truck-Cold.git
cd MMA301---Move-Truck-Cold
git checkout main
git pull --ff-only
```

Cài API:

```powershell
cd server
npm ci
```

## 2. Nối MongoDB

API đọc `MONGODB_URI` trong `server\.env`. Git không nhận file này.

```powershell
cd server
Copy-Item .env.example .env
```

Sửa thành:

```text
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/move_truck
FRONTEND_ORIGIN=http://127.0.0.1:5173
NODE_ENV=development
AUTH_SECRET=
```

`AUTH_SECRET` mỗi người tự đặt, ít nhất 32 ký tự.

Tên database dùng `move_truck`. `npm run seed:demo` từ chối database tên `coldi`, `admin`, `local`, hoặc `config`.

Chỉ một MongoDB nghe cổng `27017`.

MongoDB đã cài trên Windows: dịch vụ MongoDB phải đang chạy.

Chưa có MongoDB: mở Docker Desktop, rồi trong `server`:

```powershell
docker compose up -d
```

Image là `mongo:7`, cổng `127.0.0.1:27017`. Tắt mà giữ dữ liệu: `docker compose stop`.

MongoDB Atlas: dán chuỗi `mongodb+srv://...` vào `MONGODB_URI`, thay mật khẩu, và mở Network Access cho máy đang chạy API. Đừng commit chuỗi có mật khẩu.

Chạy API:

```powershell
cd server
npm run dev
```

Log cần có `MongoDB connected.` Kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

`database : connected` là đã nối được.

Tài khoản thử, chỉ trên database `move_truck`. Điền mật khẩu 8–72 ký tự cho bốn biến `DEMO_*_PASSWORD` trong `.env`, rồi:

```powershell
cd server
npm run seed:demo
npm run seed:fleet
```

| Email | Vai |
| --- | --- |
| `shipper.demo@coldi.local` | Chủ hàng |
| `carrier.demo@coldi.local` | Nhà xe |
| `driver.demo@coldi.local` | Tài xế |
| `admin.demo@coldi.local` | Quản trị |

## 3. Bắt đầu app mobile

```powershell
cd mobile
npm install
npm start
```

`App.tsx` chỉ là điểm vào. Màn hình và logic để đúng thư mục:

| Đường dẫn | Việc |
| --- | --- |
| `src/navigation` | Tab, stack, drawer |
| `src/screens/shipments` | Danh sách và chi tiết chuyến |
| `src/screens/favorites` | Chuyến đã lưu |
| `src/screens/search` | Tìm theo mô tả hàng hoặc tuyến |
| `src/screens/reviews` | Sao và nhận xét |
| `src/services/api` | Gọi API. Không gọi `fetch` trong màn hình |
| `src/components` | Nút và thẻ dùng chung |
| `src/features` | Lọc, sắp cước, lưu, đánh giá |

API cho app, cookie phiên tên `coldi_session`:

- `GET /api/mobile/shipments?q=&temperature=&sort=priceDesc`
- `GET /api/mobile/shipments/:id`
- `GET` và `POST /api/mobile/shipments/:id/reviews`
- `GET` và `POST /api/mobile/favorites`
- `DELETE /api/mobile/favorites/:shipmentId`
- `DELETE /api/mobile/favorites`

Nhà xe thấy đơn đang tìm xe. Chủ hàng chỉ thấy đơn của mình. App hiện chưa gọi các đường này. Viết hàm trong `src/services/api` trước, rồi gắn vào màn hình.

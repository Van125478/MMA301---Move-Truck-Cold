# Move Truck Cold

Kho này dùng để làm backend và app mobile. Nhánh làm việc là `main`.

Người mới làm đúng thứ tự: lấy mã, nối MongoDB, chạy API, rồi mở app trong `mobile`.

## Hệ thống là gì

Đây là sàn vận tải lạnh. Không có máy tự ghép đơn.

1. Chủ hàng đăng một đơn chở hàng lạnh và ghi cước niêm yết. Đơn ở trạng thái đang tìm xe. Nhóm nhiệt là Lạnh mát, Đông, hoặc Cực lạnh.
2. Nhà xe tự chọn đơn trên sàn và bấm nhận.
3. Nhà xe gán một xe đang rảnh và một tài xế của mình. Một xe chỉ giữ một chuyến chưa xong.
4. Tài xế xác nhận đã lấy hàng, gửi vị trí khi đang chở, rồi xác nhận đã giao.
5. Xác nhận giao chỉ ghi nhận hàng đã tới. Bước đó không thu tiền và không xuất hóa đơn.

Bốn vai: chủ hàng, nhà xe, tài xế, quản trị. Một tài khoản một vai. Tài xế do nhà xe tạo, không tự vào sàn nhận chuyến.

App mobile hiện có đăng nhập, đăng ký, quên mật khẩu, giữ phiên và mở đúng vai. Danh sách đơn, nhận chuyến, tài xế và yêu thích để thành viên 2, 3, 4 gắn tiếp. Yêu thích theo bài lưu bằng AsyncStorage trên máy.

## Việc backend cho bài mobile

Các đường dưới đây đã có trên API. Hủy đơn chỉ khi trạng thái còn `PUBLISHED`. Quên mật khẩu không gửi email: ngoài production, mã một lần hiện trên app trong 15 phút.

| Việc | Đường | Ai |
| --- | --- | --- |
| Đăng ký | `POST /api/auth/register` | Khách. Chỉ `SHIPPER` hoặc `CARRIER` |
| Đăng nhập, phiên, đăng xuất | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | Đúng tài khoản |
| Quên và đặt lại mật khẩu | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Email của tài khoản đang mở |
| Danh sách, chi tiết, tạo đơn | `GET /api/shipments/mine`, `GET /api/shipments/:id`, `POST /api/shipments` | SHIPPER |
| Hủy đơn đang tìm xe | `POST /api/shipments/:id/cancel` với `{}` | SHIPPER, đúng chủ đơn |
| Sàn và nhận chuyến | `GET /api/carrier/shipments`, `POST /api/carrier/shipments/:id/claim` | CARRIER |
| Chuyến đã nhận, gán xe và tài xế | `GET /api/carrier/shipments/claimed`, `POST /api/carrier/shipments/:id/assign` | CARRIER |
| Chuyến của tài xế, lấy hàng, giao hàng | `GET /api/driver/shipments`, `POST /api/driver/shipments/:id/pickup`, `POST /api/driver/shipments/:id/delivery` | DRIVER |

Chi tiết màn hình người 1 nằm ở [mobile/README.md](mobile/README.md). Cách bấm nghiệm thu nằm ở [mobile/NGHIEM_THU.md](mobile/NGHIEM_THU.md).

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

API đọc `server\.env` trên chính máy đang chạy. Git không nhận file này. Gửi file `.env` cho máy khác không gửi theo database. `127.0.0.1` trong `MONGODB_URI` là MongoDB của máy đó.

Chỉ tạo file khi `server\.env` chưa có. `Copy-Item .env.example .env` ghi đè file đang có, kể cả file vừa được gửi sang, và để `AUTH_SECRET` trống.

```powershell
cd server
Copy-Item .env.example .env
```

Mở `server\.env`, điền trước khi chạy API:

```text
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/move_truck
FRONTEND_ORIGIN=http://127.0.0.1:5173
NODE_ENV=development
AUTH_SECRET=một chuỗi tự đặt, ít nhất 32 ký tự
DEMO_SHIPPER_PASSWORD=một mật khẩu tự đặt, 8 đến 72 ký tự
DEMO_CARRIER_PASSWORD=một mật khẩu tự đặt, 8 đến 72 ký tự
DEMO_DRIVER_PASSWORD=một mật khẩu tự đặt, 8 đến 72 ký tự
DEMO_ADMIN_PASSWORD=một mật khẩu tự đặt, 8 đến 72 ký tự
```

`npm ci` chỉ cài thư viện. `AUTH_SECRET` còn trống thì `npm run dev` dừng với `Missing required environment variable AUTH_SECRET.` Chuỗi ngắn hơn 32 ký tự thì báo `AUTH_SECRET must be at least 32 characters.`

Tên database trong URI nên là `move_truck`. `npm run seed:demo` từ chối database tên `coldi`, `admin`, `local`, hoặc `config`. Database tên `coldi_demo_local` cũng bị từ chối, log là `Refusing to write demo accounts on database coldi_demo_local.`, trừ khi `.env` có thêm đúng dòng:

```text
DEMO_CREDENTIAL_SYNC_DATABASE=coldi_demo_local
```

`npm run seed:fleet` cần bốn tài khoản demo đã có. Nếu `seed:demo` vừa bị từ chối, fleet báo `Demo carrier and driver accounts must exist.`

Nếu file `.env` copy từ máy khác có `CARGO_IMAGE_DIR` hoặc `INCIDENT_EVIDENCE_DIR` trỏ vào thư mục của người đó, đăng nhập vẫn chạy. Ảnh hàng hóa chỉ dùng được sau khi đổi hai đường đó sang thư mục thật trên máy này, hoặc xóa hai dòng đó.

`seed:demo` tạo tài khoản còn thiếu và không đổi mật khẩu tài khoản đã có. Muốn ghi lại mật khẩu theo `.env`, đặt cả hai dòng sau cho đúng database đang nối, rồi chạy lại `seed:demo`:

```text
DEMO_CREDENTIAL_SYNC=confirm
DEMO_CREDENTIAL_SYNC_DATABASE=move_truck
```

Với database `coldi_demo_local`, dòng thứ hai phải là `coldi_demo_local`.

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

`database : connected` là đã nối được. Giữ cửa sổ này mở. Mở terminal khác, vẫn trong `server`:

```powershell
npm run seed:demo
npm run seed:fleet
```

Thành công khi thấy `Created demo SHIPPER account shipper.demo@coldi.local.` và log fleet có `Prepared demo fleet: 1 primary + 5 extra drivers`. Nếu tài khoản đã có từ trước, dòng sẽ là `Kept existing SHIPPER account ... Password was not changed.`

Đăng nhập bằng email trong bảng và đúng chữ sau dấu `=` của biến mật khẩu cùng hàng. Gõ nguyên tên biến, ví dụ `DEMO_SHIPPER_PASSWORD`, thì API trả câu sai mật khẩu.

| Email | Biến mật khẩu | Vai |
| --- | --- | --- |
| `shipper.demo@coldi.local` | `DEMO_SHIPPER_PASSWORD` | Chủ hàng |
| `carrier.demo@coldi.local` | `DEMO_CARRIER_PASSWORD` | Nhà xe |
| `driver.demo@coldi.local` | `DEMO_DRIVER_PASSWORD` | Tài xế (chính) |
| `driver2.demo@coldi.local` … `driver6.demo@coldi.local` | `DEMO_DRIVER_PASSWORD` | Tài xế thêm (sau `seed:fleet`) |
| `admin.demo@coldi.local` | `DEMO_ADMIN_PASSWORD` | Quản trị |

## 3. Bắt đầu app mobile

```powershell
cd mobile
npm install
npm start
```

`App.tsx` chỉ là điểm vào. Màn hình người 1 nằm trong `mobile/src/screens/auth`. Thành viên 2, 3, 4 gắn màn đơn, chuyến và yêu thích vào `mobile/src/screens` và `mobile/src/features`. Cookie phiên tên `coldi_session`.

`/api/mobile/shipments` và `/api/mobile/favorites` vẫn có trên máy chủ. Bài mobile giữ yêu thích bằng AsyncStorage, không dùng API yêu thích đó.

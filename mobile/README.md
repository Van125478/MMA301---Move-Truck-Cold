# Coldi mobile

Cài máy, MongoDB và tài khoản demo nằm ở [BAT_DAU.md](../BAT_DAU.md). Đọc file đó trước.

Ứng dụng Expo cho vận tải lạnh. Backend đang có nằm ở `server/`, đường `/api/mobile`. App này chưa gọi API. Cấu trúc dưới đây là chỗ cả nhóm để màn hình và logic.

Chạy sau khi cài gói:

```bash
cd mobile
npm install
npm start
```

## Thư mục

| Đường dẫn | Việc để ở đây |
| --- | --- |
| `App.tsx` | Điểm vào. Sau này chỉ gắn navigator, không viết màn hình tại file này. |
| `src/navigation` | Tab dưới, stack chi tiết, drawer. |
| `src/screens/shipments` | Danh sách chuyến và màn chi tiết. |
| `src/screens/favorites` | Danh sách chuyến đã lưu quan tâm. |
| `src/screens/search` | Ô tìm theo mô tả hàng hoặc tuyến. |
| `src/screens/reviews` | Sao và nhận xét của một chuyến. |
| `src/components/common` | Nút, ô nhập, trạng thái tải, dùng chung. |
| `src/components/shipment` | Thẻ chuyến, nhãn nhóm nhiệt. |
| `src/features/shipments` | Lọc nhóm nhiệt, sắp cước, cờ cực lạnh. |
| `src/features/favorites` | Thêm, xóa một, xóa hết. |
| `src/features/reviews` | Gửi đánh giá, nhóm theo số sao. |
| `src/services/api` | Hàm gọi `/api/mobile`. Không gọi `fetch` trong màn hình. |
| `src/hooks` | Hook dùng lại giữa các màn. |
| `src/types` | Kiểu chuyến, đánh giá, yêu thích. |
| `src/constants` | Địa chỉ API và nhãn nhóm nhiệt. |
| `src/utils` | Hàm thuần, không phụ thuộc màn hình. |
| `assets` | Icon và ảnh tĩnh của app. |

`ios/` và `android/` không commit. Expo tạo hai thư mục đó khi build.

## API để nối sau

Cookie phiên tên `coldi_session`, cùng máy chủ API ở cổng `4000`.

- `GET /api/mobile/shipments?q=&temperature=&sort=priceDesc`
- `GET /api/mobile/shipments/:id`
- `GET` và `POST /api/mobile/shipments/:id/reviews`
- `GET` và `POST /api/mobile/favorites`
- `DELETE /api/mobile/favorites/:shipmentId`
- `DELETE /api/mobile/favorites`

Nhà xe thấy đơn đang tìm xe. Chủ hàng chỉ thấy đơn của mình. Tài xế không gọi các đường này.

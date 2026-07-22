# Solar Calculator API

Tất cả response thành công có dạng `{ "success": true, "data": ... }`. Response lỗi có dạng `{ "error": { "code": "...", "message": "...", "issues": [] } }`.

## Public endpoints

| Method | Route | Mô tả |
| --- | --- | --- |
| `POST` | `/api/calculations` | Validate input, tính toán, lưu snapshot và trả `calculationId` |
| `POST` | `/api/leads` | Tạo lead liên kết với calculation đã tồn tại |
| `GET` | `/api/packages` | Danh sách package đang hoạt động |
| `GET` | `/api/provinces` | Danh sách tỉnh/thành đang hoạt động |

## Xác thực quản trị

Trang quản trị và admin API sử dụng session cookie được ký bằng HMAC. Đăng nhập
gửi `ADMIN_USERNAME` và `ADMIN_PASSWORD` tới `/api/admin/auth/login`; khi thành
công server đặt cookie `solar_admin_session` dạng `HttpOnly`, `SameSite=Strict`
và có thời hạn 8 giờ. Ở production bắt buộc cấu hình
`ADMIN_SESSION_SECRET` đủ mạnh và chỉ phục vụ ứng dụng qua HTTPS.

| Method | Route | Mô tả |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Đăng nhập và tạo session cookie |
| `POST` | `/api/admin/auth/logout` | Hủy session hiện tại |

## Admin endpoints

Các endpoint dưới đây yêu cầu session quản trị hợp lệ. Mutation quản trị kiểm
tra thêm `Origin` khi request có gửi header này.

| Method | Route | Mô tả |
| --- | --- | --- |
| `GET`, `POST` | `/api/admin/packages` | Danh sách hoặc tạo package |
| `GET`, `PATCH` | `/api/admin/packages/:id` | Xem hoặc cập nhật package |
| `POST` | `/api/admin/packages/:id/disable` | Vô hiệu hóa package, không xóa cứng |
| `GET`, `PATCH` | `/api/admin/settings` | Đọc hoặc cập nhật settings |
| `GET`, `POST` | `/api/admin/provinces` | Danh sách hoặc tạo province factor |
| `PATCH` | `/api/admin/provinces/:id` | Cập nhật province factor |
| `GET` | `/api/admin/leads` | Danh sách lead và tóm tắt calculation |
| `PATCH` | `/api/admin/leads/:id` | Cập nhật trạng thái lead |

## Status codes

- `200`: thao tác thành công.
- `201`: tạo dữ liệu thành công.
- `400`: JSON hoặc route parameter không hợp lệ.
- `401`: thiếu, sai hoặc hết hạn phiên quản trị.
- `403`: request mutation quản trị có nguồn không hợp lệ.
- `404`: không tìm thấy dữ liệu.
- `409`: trùng dữ liệu hoặc xung đột tham chiếu.
- `413`: request body vượt quá giới hạn.
- `415`: request không dùng `application/json`.
- `422`: dữ liệu không đạt Zod validation.
- `429`: đăng nhập sai quá số lần cho phép trong cửa sổ giới hạn.
- `500`: lỗi máy chủ không dự kiến.
- `503`: settings hoặc tài khoản quản trị chưa được cấu hình.

Chi tiết cấu hình và cách khởi chạy xem tại `README.md`.

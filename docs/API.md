# Solar Calculator API

Tất cả response thành công có dạng `{ "success": true, "data": ... }`. Response lỗi có dạng `{ "error": { "code": "...", "message": "...", "issues": [] } }`.

## Public endpoints

| Method | Route | Mô tả |
| --- | --- | --- |
| `POST` | `/api/calculations` | Validate input, tính toán, lưu snapshot và trả `calculationId` |
| `POST` | `/api/leads` | Tạo lead liên kết với calculation đã tồn tại |
| `GET` | `/api/packages` | Danh sách package đang hoạt động |
| `GET` | `/api/provinces` | Danh sách tỉnh/thành đang hoạt động |

Mọi response mới của `POST /api/calculations` có thêm `metadata`,
`normalizedInput` và `sourceSnapshot`. `metadata` chứa phiên bản thuật toán,
phiên bản/hash dữ liệu, confidence, cảnh báo và kết quả kiểm tra cổng dữ liệu.
`sourceSnapshot` giữ nguyên biểu giá, package, settings và hệ số tỉnh đã dùng để
kết quả cũ không phụ thuộc dữ liệu live về sau.

Snapshot chưa được liên kết qua `POST /api/leads` hết hạn theo
`CALCULATION_RETENTION_DAYS` (mặc định 30 ngày). Cơ chế dọn và phần còn phải
phê duyệt trước production được mô tả tại
[Dữ liệu khách hàng và thời hạn lưu](./CUSTOMER-DATA-RETENTION.md).

### Payload calculation V2.1

Luồng khách hàng mới gửi contract `2.1.0`. Client chỉ gửi dữ liệu khách cung cấp;
provenance, confidence, giá trị chuẩn hóa và giả định do server tạo.

```json
{
  "schemaVersion": "2.1.0",
  "energy": {
    "method": "kwh",
    "observations": [
      { "period": "2026-06", "valueKwh": 420 },
      { "period": "2026-07", "valueKwh": 460 }
    ]
  },
  "site": {
    "province": "ho-chi-minh",
    "daytimeBehavior": "some_daytime_use",
    "roof": { "known": false },
    "backup": { "required": false }
  }
}
```

- `observations` có từ 1 đến 12 phần tử cùng loại.
- `period` là tùy chọn với kWh và bắt buộc với tổng tiền, theo định dạng
  `YYYY-MM`, từ `2000-01` đến tháng hiện tại theo múi giờ Việt Nam; các kỳ trong
  một request không được trùng.
- `roof.known=false` được lưu là `null`, không dùng số giả thay thế.
- Khi `backup.required=true`, có thêm `essentialLoadWatts` và `backupHours`;
  hai giá trị có thể là `null` để ghi rõ cần khảo sát.
- Không có trường điện thoại, tên, địa chỉ hoặc dữ liệu liên hệ trong request
  calculation.

Đầu vào nhiều tháng chỉ đạt confidence `high` khi có ít nhất ba kỳ liên tiếp,
đều ghi rõ tháng và kỳ mới nhất không quá hai tháng trước. Quy tắc này ảnh hưởng
metadata/confidence, không làm mất các quan sát gốc trong snapshot.

`energy.method=money` mang `amountBasis=total_payment`, kỳ hóa đơn và một trong
ba `billingContext`: `standard_single_household`, `known` hoặc `unknown`.
Nhánh `known` khai rõ số hộ, khoản khác và kỳ chuẩn hoặc
`billingDays/referenceDays`. Nhánh `unknown` trả khoảng kWh rộng; nếu hai biên
không cùng chọn một gói, `recommendedPackage=null` và không có danh sách so
sánh mang tính chốt bán.

Biểu giá và VAT được chọn theo từng kỳ. API báo gap/overlap/không hiệu lực thay
vì dùng version gần nhất. Production trả `503` nếu tariff/VAT chưa được duyệt;
development/test chỉ cho phép preview có nhãn dữ liệu chưa duyệt.

Contract `2.0.0` vẫn đọc được cho request kWh/snapshot cũ. Nhánh tiền `2.0.0`
trả `MONEY_CONTEXT_REQUIRED` vì thiếu xác nhận thành phần hóa đơn. Luồng legacy
tiền điện năng trước VAT vẫn được đọc để tương thích, nhưng bắt buộc gửi đồng thời
`inputContractVersion="legacy-v1"`,
`billAmountBasis="energy_charge_before_vat"` và `customerConfirmed=true`.
Payload chỉ có `monthlyBill` bị từ chối vì ý nghĩa số tiền còn mơ hồ. Legacy
không còn là payload của giao diện khách hàng.

Contract và điểm nối OCR/dữ liệu thật được mô tả tại
[Đầu vào khách hàng Giai đoạn 1](./PHASE-1-CUSTOMER-INPUT.md) và
[Biểu giá/VAT Giai đoạn 2](./PHASE-2-TARIFF-ENGINE.md).

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
- `422`: dữ liệu không đạt validation hoặc không thể chuẩn hóa an toàn. Các mã
  nghiệp vụ gồm `MONEY_CONTEXT_REQUIRED`, `BILL_COMPONENTS_INCONSISTENT`,
  `TARIFF_GAP`, `TARIFF_OVERLAP`, `TARIFF_PERIOD_SPANS_VERSIONS`,
  `VAT_RULE_GAP`, `VAT_RULE_OVERLAP`, `VAT_RULE_PERIOD_SPANS_VERSIONS` và
  `OCR_PIPELINE_NOT_AVAILABLE`; các lỗi này không tạo calculation.
- `429`: đăng nhập sai quá số lần cho phép trong cửa sổ giới hạn.
- `500`: lỗi máy chủ không dự kiến.
- `503`: settings/tài khoản quản trị chưa được cấu hình,
  `TARIFF_UNAPPROVED`, `VAT_RULE_UNAPPROVED`, hoặc
  `CALCULATION_DATA_NOT_VERIFIED` khi production gặp dữ liệu `DEMO`, `DRAFT`,
  hết hạn, bị tắt hay không khớp nội dung đã duyệt. Trường hợp này không tạo
  calculation.

Chi tiết cấu hình và cách khởi chạy xem tại `README.md`.

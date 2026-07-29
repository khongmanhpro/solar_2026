# Báo cáo ảnh hưởng — workbook dữ liệu thị trường 29/07/2026

## Kết luận

Workbook đọc được và đủ cấu trúc để tạo bundle ứng viên có thể truy vết. Theo
quyết định ngày 29/07/2026, dữ liệu được phép chạy ở chế độ thử nghiệm local/dev
có cảnh báo và giả định tạm; vẫn không đủ điều kiện mở production.

## Dữ liệu đã chuẩn hóa

- 14 gói ứng viên.
- 20 thiết bị.
- 34 vùng phục vụ.
- 14 dòng giá nhà cung cấp.
- Dataset version: `market-data-candidate-02e6caba7b76`.
- SHA-256 file nguồn:
  `02e6caba7b76f8bc04bebd1a0e03617dc700aa33507de47024672b54cc42994e`.

Bundle kết quả: `data/market-data-candidate.json`. File Excel gốc không được
chép vào repository; bundle loại trừ sheet hóa đơn và không chứa dữ liệu nhận
dạng khách hàng.

## Cổng đang chặn production

1. Không có gói nào vừa được đánh dấu đang bán vừa được công bố.
2. Không gói nào đủ trường bắt buộc của engine hiện tại: sản lượng nền và diện
   tích mái đang thiếu.
3. Chưa có dữ liệu sản lượng 12 tháng theo vùng được duyệt.
4. Có 0/10 ca nghiệm thu đạt.
5. Giá 14 gói là ước lượng thị trường, sai số dự kiến ±15%, không phải báo giá
   chính thức.
6. VAT chưa được xác định cho ít nhất một gói.

## Ảnh hưởng của thay đổi hiện tại

| Thành phần | Ảnh hưởng |
| --- | --- |
| Database local | Đã thêm 14 record `DRAFT` phiên bản `market-data-trial-02e6caba7b76-v1`; không migration và không sửa 4 gói demo cũ |
| Backup | Đã tạo `prisma/dev.db.backup-before-market-data-trial-02e6caba7b76-v1-2026-07-28T19-08-01-226Z` trước khi import |
| Kết quả calculation local/dev | Khi bật cờ, API và engine chỉ dùng 14 gói trial; khi tắt cờ quay lại 4 gói demo cũ |
| Snapshot cũ | Không đổi |
| Production chính thức | Không mở; tiếp tục chặn dữ liệu chưa VERIFIED |
| Public preview trên VPS | Chỉ mở khi đồng thời bật `TRIAL_MARKET_DATA_ENABLED=true` và `PUBLIC_PREVIEW_MODE_ENABLED=true` |
| Source data | Tạo bundle DRAFT có source hash và content hash |
| Trial local/dev | Đang bật bằng `TRIAL_MARKET_DATA_ENABLED=true` trong `.env` cục bộ |
| Dependency | Thêm `read-excel-file` ở devDependencies để đọc workbook |
| Framework | Nâng bản vá Next.js 16.2.10 → 16.2.11 theo security release |

## Rủi ro còn lại

`npm audit --omit=dev` vẫn báo `sharp <0.35.0` qua Next.js. Dự án không sử dụng
`next/image`, nên đường xử lý ảnh dễ bị ảnh hưởng hiện không được gọi; vẫn cần
theo dõi bản Next.js hỗ trợ Sharp 0.35.x thay vì ép override không tương thích.

## Điều kiện để nhập database

### Thử nghiệm local/dev

- `data:preview-trial` phải hiển thị đủ 14 gói và công thức suy ra.
- `data:import-trial` tạo backup, transaction và chỉ ghi record trial ở DRAFT.
- `TRIAL_MARKET_DATA_ENABLED=true` chỉ có hiệu lực khi `NODE_ENV=development`.
- Giao diện phải cảnh báo giá ±15%, khảo sát bắt buộc và không phải báo giá.

### Production

- Giá chính thức, VAT, hiệu lực và phạm vi gói đã duyệt.
- Diện tích mái hoặc quy tắc dẫn xuất có nguồn.
- Mô hình sản lượng 12 tháng đã thay thế `baseMonthlyGenerationKwh`.
- Hỗ trợ pha điện trong input, persistence và eligibility.
- Tối thiểu 10 ca nghiệm thu độc lập đạt.
- Import có backup, transaction, rollback và content hash khớp manifest.

`PUBLIC_PREVIEW_MODE_ENABLED` chỉ là ngoại lệ có chủ đích để khách dùng thử dữ
liệu DRAFT trên VPS. Cờ này không biến dữ liệu thành `VERIFIED` và phải được tắt
khi chuyển sang tư vấn hoặc báo giá chính thức.

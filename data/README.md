# Dữ liệu nghiệp vụ có phiên bản

Thư mục này là điểm nạp dữ liệu thật cho calculation engine. Dữ liệu ở đây
được bundle ở build time, kiểm tra bằng TypeScript/tests và chụp vào snapshot;
không sửa trực tiếp qua giao diện quản trị.

## Cập nhật biểu giá hoặc VAT

1. Thêm record mới vào `electricity-tariffs.json`; không sửa/xóa version đã được
   dùng trong calculation cũ.
2. Dùng version mới và khai ngày hiệu lực bao gồm cả hai đầu. Record chưa có
   ngày áp dụng phải để `effectivePeriod.from=null` và `selectable=false`.
3. Đính kèm nguồn chính thức. Ảnh, bài báo hoặc phép nhân tỷ lệ chỉ được đánh
   dấu `candidate_derived`, không được coi là đơn giá hiệu lực.
4. Giữ `requires_internal_approval` đến khi pháp lý/tài chính ký duyệt, có mẫu
   hóa đơn ẩn danh đối soát và content hash đã nghiệm thu.
5. Thêm golden cases cho mọi bậc, ngày hiệu lực, VAT, nhiều hộ, kỳ đổi ngày và
   khoản khác; chạy toàn bộ test/build.
6. Cập nhật manifest trong `src/config/data-governance.ts` bằng version/hash đã
   duyệt. Production vẫn chặn nếu registry và manifest không khớp.

Không mở rộng ngày kết thúc VAT chỉ vì chưa có chính sách mới. Khi không có
record bao phủ kỳ khách nhập, hệ thống phải trả lỗi thiếu quy tắc thay vì dùng
mức thuế gần nhất.

Checklist và hợp đồng chi tiết nằm tại
[`docs/PHASE-2-TARIFF-ENGINE.md`](../docs/PHASE-2-TARIFF-ENGINE.md).

## Bundle ứng viên từ Excel thị trường

`market-data-candidate.json` là bản chuẩn hóa chỉ đọc từ workbook thị trường.
Bundle lưu tên file nguồn, SHA-256, content hash, các gói/thiết bị/vùng phục vụ,
giá nhà cung cấp và toàn bộ cổng đang chặn production.

Các lệnh kiểm tra:

```bash
npm run data:validate -- /duong-dan/file.xlsx
npm run data:preview -- /duong-dan/file.xlsx
npm run data:preview-trial -- /duong-dan/file.xlsx
npm run data:build-candidate -- /duong-dan/file.xlsx data/market-data-candidate.json
npm run data:import-draft -- /duong-dan/file.xlsx --confirm-draft-import
npm run data:import-trial -- /duong-dan/file.xlsx --confirm-trial-import
```

`data:validate` và `data:preview` không ghi database. `data:build-candidate` chỉ
ghi JSON ứng viên sau khi cấu trúc workbook hợp lệ; nó không sửa package đang
dùng, không đổi kết quả tính và không nâng record thành `VERIFIED`.

Bundle ứng viên không được nối trực tiếp vào engine khi còn một trong các điều
kiện: gói chưa công bố, giá chỉ là ước lượng, VAT chưa rõ, thiếu diện tích mái,
thiếu sản lượng vùng 12 tháng hoặc chưa có ca nghiệm thu đạt.

`data:import-draft` chỉ chạy khi mọi gói đủ trường engine, cần cờ xác nhận, tạo
backup SQLite trước khi ghi và dùng transaction. Gói mới luôn được nhập với
`DRAFT`, `active=false`; lệnh từ chối ghi đè mã package đã tồn tại.

`data:preview-trial` và `data:import-trial` dành cho catalog preview.
Release thử nghiệm suy ra sản lượng thiếu bằng 120 kWh/kWp/tháng và diện tích
mái từ kích thước tấm Risen cộng 15% khoảng lắp đặt. Import tạo backup, chỉ
upsert record có version `market-data-trial-*`, giữ `DRAFT`, và không ghi đè
record ngoài trial. Development cần `TRIAL_MARKET_DATA_ENABLED=true`. VPS chạy
public preview phải bật thêm `PUBLIC_PREVIEW_MODE_ENABLED=true`; nếu thiếu cờ
này thì production vẫn yêu cầu dữ liệu `VERIFIED`.

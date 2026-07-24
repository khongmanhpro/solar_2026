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

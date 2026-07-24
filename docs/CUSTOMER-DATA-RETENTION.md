# Dữ liệu khách hàng và thời hạn lưu

Tài liệu này mô tả hành vi hiện có của luồng khách hàng. Đây là kiểm soát kỹ
thuật, không thay thế việc doanh nghiệp xác lập căn cứ và chính sách pháp lý.

## Trước khi khách gửi thông tin liên hệ

Để trả một `calculationId`, hệ thống lưu snapshot gồm các kỳ kWh hoặc số tiền,
bối cảnh hóa đơn, tỉnh/thành và câu trả lời về mái/điện dự phòng. Snapshot cần
cho việc giải thích lại kết quả và bảo toàn phiên bản thuật toán/dữ liệu.

- Mặc định calculation không có lead được giữ 30 ngày.
- `CALCULATION_RETENTION_DAYS` cho phép cấu hình từ 1 đến 365 ngày.
- Khi lưu calculation mới, hệ thống xóa cứng calculation quá hạn không có lead.
- Production phải chạy `npm run privacy:purge-calculations` theo lịch hằng ngày;
  cơ chế khi có lượt tính mới chỉ là lớp dự phòng và không bảo đảm đúng hạn khi
  hệ thống không có lưu lượng.
- OCR chưa hoạt động nên file hóa đơn không được lưu vào calculation.

Analytics phía trình duyệt không gửi số tiền, kWh, kỳ hóa đơn, tên file, số điện
thoại, `calculationId` hoặc nội dung khách nhập.

## Sau khi khách chủ động gửi đăng ký khảo sát

Calculation đã gắn lead được giữ để nhân viên có thể giải thích đúng kết quả mà
khách đã xem. Tác vụ dọn calculation chưa có lead sẽ bỏ qua hồ sơ này.

Trước production, chủ dữ liệu còn phải chốt và công bố:

1. mục đích/căn cứ xử lý và thời hạn giữ lead;
2. người có quyền truy cập;
3. cách khách yêu cầu xem, sửa hoặc xóa dữ liệu;
4. quy trình xóa lead cùng calculation liên quan và bản sao lưu;
5. lịch chạy tác vụ dọn, log kiểm tra và người chịu trách nhiệm.

Nếu chưa có năm quyết định này, hệ thống không được tuyên bố đã hoàn tất chính
sách lưu giữ dữ liệu production.

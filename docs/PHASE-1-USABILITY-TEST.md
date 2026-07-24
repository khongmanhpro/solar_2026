# Kịch bản nghiệm thu khả dụng — Giai đoạn 1

Hai ngưỡng `≥85% hoàn tất` và `≤60 giây trung vị` chỉ được công nhận sau khi
quan sát người dùng thật. File này là phiếu chạy test; chưa có số liệu thì không
được tự đánh dấu đạt.

## Mẫu người tham gia

- Tối thiểu 10 người dùng điện sinh hoạt, ưu tiên 15–20 người.
- Phần lớn không làm công nghệ, năng lượng hoặc điện mặt trời.
- Có cả người dùng điện thoại Android cấu hình phổ thông và iPhone.
- Không dùng nhân viên đã biết trước giao diện làm mẫu chính.

Không thu tên, số điện thoại, mã khách hàng hoặc ảnh hóa đơn thật trong buổi
test. Dùng số kWh giả lập được phát sẵn.

## Kịch bản chính

Đưa cho người tham gia dữ liệu: `420 kWh`, khu vực Hồ Chí Minh, có người ở và
dùng một số thiết bị ban ngày, không biết diện tích mái, không cần điện dự
phòng. Chỉ nói:

> Hãy dùng trang này để xem một phương án điện mặt trời sơ bộ cho ngôi nhà.

Không hướng dẫn vị trí nút hoặc giải thích thuật ngữ trong lúc tính giờ.

## Cách đo

- Bắt đầu: khi người dùng chạm/nhấp lần đầu vào công cụ.
- Hoàn tất: khi màn hình kết quả xuất hiện.
- Thất bại: bỏ cuộc, cần người điều phối làm hộ hoặc không thể sửa lỗi.
- Ghi thời gian theo giây cho từng người hoàn tất.
- Ghi riêng thiết bị, bước bị vướng và câu nói nguyên ý; không ghi PII.

```text
completion_rate = số người hoàn tất / tổng số người bắt đầu
median_time = trung vị thời gian của những người hoàn tất
```

## Cổng đạt

- Tỷ lệ hoàn tất ít nhất 85%.
- Trung vị không quá 60 giây.
- Không người nào bị buộc cung cấp số điện thoại trước kết quả.
- 100% người chọn mái “không biết” hiểu rằng hệ thống chưa xác nhận lắp được.
- 100% người thử nhập tổng tiền nhìn thấy hướng dẫn chuyển sang kWh, không hiểu
  nhầm rằng đã có kết quả chính xác.

## Phiếu kết quả

| Mã ẩn danh | Thiết bị | Hoàn tất | Giây | Bước vướng | Ghi chú không PII |
| --- | --- | --- | ---: | --- | --- |
| U01 |  |  |  |  |  |

Sau mỗi vòng, sửa vấn đề chung rồi chạy lại với người mới. Không gộp số liệu của
hai phiên bản giao diện thành một tỷ lệ nếu luồng hoặc câu chữ đã thay đổi đáng
kể.

## Analytics hỗ trợ

Analytics production chỉ được gửi tên phương thức, số thứ tự bước, số tháng và
trạng thái hoàn tất. Không gửi giá trị kWh, số tiền, kỳ hóa đơn, tên file, tỉnh
chi tiết, tải thiết yếu hoặc bất kỳ dữ liệu liên hệ nào.

# Đầu vào khách hàng — Giai đoạn 1

Tài liệu này mô tả hợp đồng đầu vào dành cho khách hàng và ranh giới độ chính
xác hiện tại. Mục tiêu là để một người không rành công nghệ có thể cung cấp ít
thông tin nhất, đồng thời không biến dữ liệu chưa biết thành một con số giả.

## Luồng khách hàng

Biểu mẫu gồm ba bước:

1. Chọn nhập `kWh`, `tổng tiền phải thanh toán` hoặc xem trạng thái tải hóa đơn.
2. Cung cấp tỉnh/thành, hành vi dùng điện 8:00–17:00, thông tin mái và nhu cầu
   điện dự phòng.
3. Kiểm tra lại dữ liệu trước khi yêu cầu tính.

Không hỏi số điện thoại trước kết quả. Loại điện không còn là câu hỏi vì hệ
thống hiện chỉ hỗ trợ điện sinh hoạt hộ gia đình; server ghi đây là một giá trị
mặc định có nguồn gốc và mã giả định.

## Hợp đồng request V2

Client chỉ gửi dữ liệu thô do khách cung cấp. Client không được tự khai
provenance, confidence hoặc kết quả chuẩn hóa.

```json
{
  "schemaVersion": "2.0.0",
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

Mỗi request có từ 1 đến 12 quan sát cùng loại. `period` là tùy chọn, dùng định
dạng `YYYY-MM`, nằm từ `2000-01` đến tháng hiện tại theo múi giờ Việt Nam và
không được trùng trong cùng request. Mái chưa biết được gửi bằng
`{ "known": false }`; không gửi `0` hoặc một diện tích mặc định.

Khi cần dự phòng, tải thiết yếu và số giờ có thể để `null`. Điều đó có nghĩa là
phải khảo sát thêm; hệ thống không được tự sinh tải, tự sinh số giờ hoặc hứa pin
đáp ứng nhu cầu khi chưa có dữ liệu DoD, SOC và công suất xả đã xác minh.

## Quy tắc chuẩn hóa

- Một giá trị kWh đi thẳng vào engine, không đi qua phép suy ngược tiền điện.
- Nhiều giá trị kWh dùng trung bình cộng và giữ nguyên toàn bộ quan sát gốc
  trong snapshot.
- Confidence chỉ được nâng lên `high` khi có ít nhất ba kỳ liên tiếp, đều ghi
  rõ tháng và kỳ mới nhất không quá hai tháng trước; dữ liệu thiếu kỳ hoặc quá
  cũ vẫn tính được nhưng được đánh dấu `medium`/`preliminary`.
- Hóa đơn cơ sở của nhánh kWh được tính theo chiều `kWh → tiền điện năng trước
  VAT`; đây là giá trị mô hình, không phải tổng tiền khách đã thanh toán.
- Hành vi ban ngày được ánh xạ thành `low`, `medium` hoặc `high`; giá trị này có
  `origin=derived` và tham chiếu câu trả lời hành vi của khách.
- Điện sinh hoạt hộ gia đình có `origin=default` và `assumptionRef`; không được
  ghi sai rằng khách đã tự chọn.
- Mọi trung bình và phép đổi đều có `derivedFrom`; mọi giá trị mặc định đều có
  `assumptionRef`.

## Tổng tiền và hóa đơn sau Giai đoạn 2

`money` luôn có nghĩa là **tổng tiền phải thanh toán**, không phải tiền điện
năng trước VAT. Contract hiện tại là `2.1.0`: kỳ hóa đơn bắt buộc và khách chọn
hóa đơn chuẩn, biết thông tin khác hoặc không chắc. Trường hợp không chắc chỉ
trả khoảng kWh và không tự chốt gói. Contract tiền `2.0.0` của Giai đoạn 1 vẫn
được nhận diện nhưng bị từ chối vì thiếu `billingContext`.

API tương thích legacy chỉ nhận tiền trước VAT khi caller khai rõ contract,
amount basis và xác nhận. Một payload trần chỉ có `monthlyBill` bị từ chối để
không thể đi vòng qua ý nghĩa `total_payment` của giao diện V2.

Biểu giá/VAT Giai đoạn 2 có nguồn chính thức nhưng vẫn chờ phê duyệt nội bộ và
hóa đơn thật đối soát, nên production tiếp tục chặn. Chi tiết tại
[`PHASE-2-TARIFF-ENGINE.md`](./PHASE-2-TARIFF-ENGINE.md).

Tải hóa đơn được hiển thị như một lựa chọn nhưng chưa gửi hoặc lưu file. Giai
đoạn 7 sẽ bổ sung endpoint upload riêng, token tài liệu, kiểm tra chất lượng,
OCR theo từng trường và bước khách xác nhận. Calculation API chỉ được nhận dữ
liệu OCR sau khi token đã được server xác minh; không nhận file hoặc base64.

## Kết quả cũ khi khách sửa

Mỗi calculation đã tạo là một snapshot bất biến. Khi khách sửa bản nháp, kết
quả cũ vẫn hiển thị cùng cảnh báo `Thông tin đã thay đổi — Cập nhật kết quả`.
Các nút gửi thông tin liên hệ, gọi và Zalo của kết quả cũ bị ẩn để khách không
gửi yêu cầu dựa trên phương án đã lỗi thời. Chỉ khi request mới thành công giao
diện mới thay kết quả. Nếu request cập nhật lỗi, kết quả cũ không bị mất.

## Đường nối dữ liệu thật

Không thay đổi request khách hàng khi bổ sung dữ liệu thật. Các điểm thay thế
được cô lập như sau:

| Dữ liệu thật | Điểm nối | Điều kiện bật |
| --- | --- | --- |
| Biểu giá, VAT, phụ phí | normalizer `money` | version, nguồn, hiệu lực, người duyệt và golden cases |
| OCR hóa đơn | upload/OCR service trả token | xác minh MIME, quyền riêng tư, confidence từng trường và khách xác nhận |
| Sản lượng tỉnh/tháng | dataset sản lượng | nguồn kỹ thuật và kiểm thử đối chiếu |
| Package/thiết bị | catalog versioned | giá, cấu hình, hiệu lực và phê duyệt |
| Pin dự phòng | thông số usable capacity/DoD/SOC/công suất xả | mô phỏng và ca nghiệm thu Giai đoạn 5 |

Production tiếp tục chặn toàn bộ calculation nếu dữ liệu nghiệp vụ còn là
`DEMO`, `DRAFT`, hết hạn hoặc không khớp content hash.

## Nghiệm thu còn cần người dùng thật

Automated test có thể chứng minh contract, validation, snapshot và việc không
làm mất kết quả. Hai tiêu chí sau phải đo bằng usability test, không được tự
đánh dấu đạt bằng unit test:

- Ít nhất 85% người tham gia hoàn thành biểu mẫu.
- Thời gian trung vị cho luồng nhập thủ công không quá 60 giây.

Analytics chỉ ghi phương thức, bước và trạng thái hoàn tất; không ghi kWh, số
tiền, kỳ hóa đơn, tên file, số điện thoại, `calculationId`, `leadId` hoặc dữ liệu
nhận dạng/liên kết cá nhân.

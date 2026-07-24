# Hợp đồng dữ liệu và cổng tin cậy — Giai đoạn 0

Tài liệu này chốt ý nghĩa dữ liệu mà hệ thống được phép dùng. Đây là hợp đồng
kỹ thuật cho mọi luồng nhập tiếp theo; không phải xác nhận rằng dữ liệu hiện tại
đã đúng để tư vấn thương mại.

## 1. Hợp đồng đầu vào chuẩn hóa

Mọi luồng `kwh`, `money` và `invoice_ocr` phải tạo một
`NormalizedEnergyInput` schema `2.1.0` trước khi tính. Sau chuẩn hóa luôn phải có:

- Loại điện sinh hoạt cùng nguồn gốc và mức tin cậy.
- `monthlyConsumptionKwh` dưới dạng `expected`, `lowerBound`, `upperBound`.
- Phiên bản biểu giá đã dùng để suy ra hoặc kiểm tra kWh.
- Nguồn của từng giá trị: khách nhập, OCR, suy ra hoặc mặc định.
- Xác nhận của khách đối với giá trị khách nhập/OCR.
- Toàn bộ quan sát gốc của 1–12 tháng cùng kỳ, loại giá trị và provenance.
- Lý do confidence và mọi cảnh báo còn tồn tại.

Giá trị `derived` bắt buộc khai báo `derivedFrom`. Giá trị `default` bắt buộc
tham chiếu `assumptionRef`. Khoảng kWh phải thỏa:

```text
lowerBound <= expected <= upperBound
```

## 2. Ý nghĩa số tiền

- Luồng V2 mặc định hiểu tiền khách nhập là **tổng tiền phải thanh toán**
  (`total_payment`).
- Luồng MVP cũ vẫn nhập **tiền điện năng trước VAT** và phải ghi rõ
  `energy_charge_before_vat`; không được ngầm đổi ý nghĩa.
- Tổng thanh toán không được suy ngược thành một điểm kWh nếu chưa tách được
  tiền điện trước VAT. VAT, phụ phí, nợ cũ hoặc khoản khác không được tính như
  điện năng; Giai đoạn 2 giữ chúng thành khoảng và trả khoảng kWh bảo thủ.
- Khi có đủ tiền điện trước VAT, VAT, phụ phí và tổng thanh toán, bốn giá trị
  phải khớp trong dung sai `1 VND`.
- Thiếu phần tách hóa đơn thì không được tự chốt gói; hệ thống trả khoảng, yêu
  cầu khách xác nhận/bổ sung hoặc chuyển sang khảo sát, không tự điền một con số
  có vẻ chính xác.
- Dữ liệu OCR chưa được khách xác nhận luôn bị chặn.

## 3. Confidence và data readiness là hai khái niệm độc lập

| Khái niệm | Trả lời câu hỏi | Mức/trạng thái |
| --- | --- | --- |
| Input confidence | Thông tin của khách đủ đáng tin đến đâu? | `insufficient`, `low`, `medium`, `high` |
| Data readiness | Bộ dữ liệu nghiệp vụ có được phép dùng chính thức không? | `DEMO`, `DRAFT`, `VERIFIED`, `EXPIRED`, `DISABLED` |

Dữ liệu nghiệp vụ đã `VERIFIED` không làm một tháng tiền điện tự trở thành
confidence cao. Ngược lại, kWh khách đọc chính xác không hợp thức hóa package
hoặc hệ số sản lượng còn là `DEMO`.

## 4. Nguồn dữ liệu và người chịu trách nhiệm

| Bộ dữ liệu | Nguồn hiện tại | Chủ sở hữu cần chốt | Trạng thái |
| --- | --- | --- | --- |
| Biểu giá sinh hoạt | Ảnh do chủ dự án cung cấp, chưa có quyết định chính thức | Pháp lý/giá điện | `DEMO` |
| Danh mục và giá gói | `src/config/defaults.ts` | Kinh doanh + kỹ thuật | `DEMO` |
| Hệ số sản lượng tỉnh | `src/config/defaults.ts` | Kỹ sư thiết kế | `DEMO` |
| Giả định tính toán/tài chính | `src/config/defaults.ts` | Kỹ thuật + tài chính | `DEMO` |

Để chuyển một bộ dữ liệu thành `VERIFIED` phải có đủ version, tài liệu nguồn,
chủ sở hữu, ngày bắt đầu hiệu lực, người duyệt, thời điểm duyệt và SHA-256 của
đúng nội dung đã duyệt. Ngày tương lai, ngày hết hạn, version lệch hoặc hash lệch
đều làm cổng production thất bại. Mọi chỉnh sửa qua chức năng hiện tại tự hạ dữ
liệu xuống `DRAFT`.

## 5. Snapshot bất biến của mỗi phép tính

Mọi calculation mới lưu đồng thời:

- `snapshotSchemaVersion`, `algorithmVersion`, `algorithmFingerprint`.
- `dataVersion` tổng hợp và version/hash của từng bộ dữ liệu.
- Input năng lượng đã chuẩn hóa và provenance của thông tin công trình.
- Nguyên biểu giá, toàn bộ gói được xét, settings, hệ số tỉnh.
- Các hằng số calculator và recommendation.
- Data readiness, input confidence, lý do và cảnh báo tại thời điểm tính.

Fingerprint dùng biểu diễn có thứ tự ổn định; đổi thứ tự truy vấn package không
làm đổi version, nhưng đổi nội dung ảnh hưởng phép tính sẽ làm đổi version.

## 6. Cổng môi trường thật

Trong development/test, hệ thống vẫn cho chạy dữ liệu `DEMO` để kiểm tra nhưng
phải gắn cảnh báo nổi bật. Trong production, nếu bất kỳ nguồn nào không đạt
`VERIFIED`, API trả `503 CALCULATION_DATA_NOT_VERIFIED` và không tạo calculation.
Seed demo cũng bị từ chối trong production và không ghi đè bất kỳ bản ghi đã
tồn tại nào.

## 7. Trạng thái hoàn thành

Khung kỹ thuật Giai đoạn 0 hoàn thành khi migration, contract, snapshot, cổng
production và regression test đều đạt. Giai đoạn 0 chỉ được đóng về nghiệp vụ
khi các ô nguồn/người duyệt trong
[Accuracy charter](./ACCURACY-ACCEPTANCE.md) được điền và bộ candidate được
chuyên gia độc lập ký thành golden cases.

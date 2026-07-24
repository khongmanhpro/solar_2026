# Accuracy charter và bộ ca nghiệm thu Giai đoạn 0–2

## 1. Trạng thái tài liệu

| Thuộc tính | Giá trị |
| --- | --- |
| Phiên bản | `0.2.0-phase2-draft` |
| Trạng thái | **Chưa được kỹ sư, tài chính hoặc pháp lý phê duyệt** |
| Phạm vi đã có regression | QD1279 6 bậc, VAT 8%, khoản khác, nhiều hộ, đổi ngày và inverse range |
| Được dùng để cam kết thương mại | **Không** |
| Lần cập nhật | 2026-07-22 |

Tài liệu này xác định cách đội phát triển kiểm tra tính ổn định số học. Nó không
xác nhận biểu giá đang có hiệu lực, không thay thế văn bản pháp lý và không biến
dữ liệu `DEMO` thành dữ liệu `VERIFIED`.

## 2. Phân biệt regression và golden case

- **Engineering regression draft:** kết quả được tính độc lập khỏi hàm đang
  test từ registry có nguồn chính thức nhưng chưa được phê duyệt nội bộ. Mục đích là phát hiện mã
  nguồn thay đổi ngoài ý muốn.
- **Golden case đã duyệt:** kết quả được một chuyên gia độc lập tính từ nguồn có
  hiệu lực, ký xác nhận và không do người viết engine tự phê duyệt.

Bộ hiện tại chỉ thuộc loại đầu tiên. Fixture chính nằm tại
`tests/fixtures/electricity-tariff-qd1279-draft-golden.json`; candidate 5 bậc cũ
chỉ được giữ để chứng minh selector không bao giờ chọn nhầm.

## 3. Ý nghĩa các giá trị hiện tại

| Giá trị | Đơn vị | Ý nghĩa hiện tại | Không bao gồm |
| --- | --- | --- | --- |
| `consumptionKwh` | kWh/kỳ | Điện năng dùng để áp biểu giá lũy tiến | Không phải số đo khi được suy từ tiền |
| `energyChargeBeforeVatVnd` | VND/kỳ | Tổng `kWh × đơn giá` của từng bậc sau điều chỉnh hạn mức | VAT và khoản khác |
| `totalPaymentVnd` | VND/kỳ | Tiền điện năng + VAT + khoản khác đã khai | Nợ/phí chưa biết nếu khách chọn `unknown` |
| Kết quả inverse | kWh/kỳ | Một điểm khi bối cảnh đã xác nhận; một khoảng khi khoản khác chưa biết | Không thay thế chỉ số công tơ |

Đầu vào khách hàng `money` luôn là **tổng tiền phải thanh toán**. Adapter legacy
tiền trước VAT chỉ tồn tại để đọc caller/snapshot cũ và không phải payload UI.

## 4. Bộ ca biên candidate

Các giá trị dưới đây được tính theo QD1279 sáu bậc, trước VAT:

| Ca | kWh | Tiền điện năng trước VAT (VND) | Mục đích |
| --- | ---: | ---: | --- |
| TARIFF-000-KWH | 0 | 0 | Điểm gốc |
| TARIFF-050-KWH | 50 | 99.200 | Cuối bậc 1 |
| TARIFF-051-KWH | 51 | 101.250 | Đơn vị đầu tiên bậc 2 |
| TARIFF-100-KWH | 100 | 201.700 | Cuối bậc 2 |
| TARIFF-101-KWH | 101 | 204.080 | Đơn vị đầu tiên bậc 3 |
| TARIFF-200-KWH | 200 | 439.700 | Cuối bậc 3 |
| TARIFF-201-KWH | 201 | 442.698 | Đơn vị đầu tiên bậc 4 |
| TARIFF-300-KWH | 300 | 739.500 | Cuối bậc 4 |
| TARIFF-301-KWH | 301 | 742.850 | Đơn vị đầu tiên bậc 5 |
| TARIFF-400-KWH | 400 | 1.074.500 | Cuối bậc 5 |
| TARIFF-401-KWH | 401 | 1.077.960 | Đơn vị đầu tiên bậc 6 |
| TARIFF-800-KWH | 800 | 2.458.500 | Ca trên bậc cao nhất |

## 5. Ngưỡng sai số

Ngoài fixture biểu giá, test tự động hiện giữ các ca candidate end-to-end ở mức
engine: hóa đơn trước VAT 2.000.000 VND với gói 3 kWp, mái 10 m² không có gói
đủ điều kiện, nhu cầu backup chỉ nhận hybrid, và pin không được tạo điện khi
không có solar dư. Các ca này vẫn là engineering regression, chưa phải lựa chọn
gói hoặc hiệu quả được kỹ sư xác nhận.

### Ngưỡng regression đang tự động kiểm tra

| Phép kiểm | Ngưỡng | Lý do |
| --- | ---: | --- |
| `kWh → tiền trước VAT` tại mọi biên | `≤ 1 VND` trước làm tròn | Bao phủ 6 bậc và context hạn mức |
| `tổng tiền → kWh` khi khoản khác đã biết | `≤ 0,01 kWh` | Bao gồm VAT/làm tròn có version |
| `kWh → tổng tiền → kWh` | `≤ 0,01 kWh` | Kiểm soát round-trip trong cùng contract |
| Tính đơn điệu tại chuỗi ca biên | Tiền phải tăng | Tăng kWh không được làm giảm tiền |
| Khoản khác chưa biết | `lower ≤ expected ≤ upper` | Không sinh một điểm chính xác giả |

### Ngưỡng nghiệm thu nghiệp vụ đề xuất — chưa phê duyệt

| Lớp | Ngưỡng đề xuất | Trạng thái |
| --- | --- | --- |
| Biên biểu giá chính thức | 100% ca đúng sau quy tắc làm tròn | Chờ pháp lý/tài chính duyệt |
| `bill → kWh → bill`, chỉ có tiền điện năng | Lệch tối đa `1 VND` | Chờ tài chính duyệt |
| Suy ngược tiền điện năng thành kWh | Lệch tối đa `0,01 kWh` | Chờ tài chính duyệt |
| Đối soát hóa đơn thật | Lệch tối đa `0,1%` hoặc `1.000 VND`, lấy mức lớn hơn | Chờ bộ hóa đơn ẩn danh và tài chính duyệt |
| Cân bằng năng lượng trong một kỳ | Lệch tối đa `0,01 kWh` | Chờ kỹ sư điện duyệt |
| Tỷ lệ và điểm xếp hạng | Lệch tối đa `0,01 điểm` | Chờ product/kỹ sư duyệt |
| Thời gian hoàn vốn | Lệch tối đa `0,01 năm` so với workbook độc lập | Chờ tài chính duyệt |
| Package được đề xuất | Khớp chính xác mã package | Chờ tập ca kỹ sư duyệt |

Ngưỡng cực nhỏ trong regression chỉ chứng minh hàm tiến và hàm nghịch nhất quán
với nhau. Nó không chứng minh hai hàm đúng với hóa đơn thực tế.

## 6. Quy tắc làm tròn đang dùng và phần còn phải chốt

Registry draft hiện quy định: không làm tròn từng bậc hoặc subtotal; VAT và tổng
thanh toán làm tròn half-up tới 1 VND. Đây là quy ước kỹ thuật có version, chưa
phải kết luận nghiệp vụ đã ký. Trước khi duyệt golden set phải có bằng chứng trả lời:

1. Làm tròn tiền từng bậc hay chỉ làm tròn tổng tiền điện năng?
2. VAT được tính và làm tròn ở bước nào?
3. Số kWh trên hóa đơn luôn là số nguyên hay có thể có phần thập phân?
4. Xử lý hóa đơn không đủ tháng và nhiều hộ dùng chung công tơ như thế nào?
5. Phụ phí nào được tách riêng và không được suy ngược thành kWh?

Cho đến khi năm câu hỏi này được duyệt, kết quả chỉ là ước tính trước khảo sát.

## 7. Trạng thái dữ liệu và cổng phát hành

| Trạng thái | Ý nghĩa | Được dùng trong production |
| --- | --- | --- |
| `DEMO` | Dữ liệu mẫu hoặc chưa có nguồn chính thức | Không |
| `DRAFT` | Dữ liệu đang chuẩn bị hoặc đã sửa sau lần duyệt gần nhất | Không |
| `VERIFIED` | Có nguồn, hiệu lực, chủ sở hữu và người duyệt | Có |
| `EXPIRED` | Đã hết hiệu lực | Không |
| `DISABLED` | Chủ động ngừng sử dụng | Không |

Một calculation chỉ đạt cổng dữ liệu khi **tất cả** biểu giá, catalog gói, dữ
liệu sản lượng và giả định được dùng đều là `VERIFIED`. Một nhãn `VERIFIED`
thiếu nguồn, ngày hiệu lực hoặc người duyệt phải được coi là `DRAFT`.

## 8. Quy trình nâng candidate thành golden case

1. Cung cấp văn bản biểu giá chính thức, ngày hiệu lực, VAT và quy tắc làm tròn.
2. Người không viết engine tính tay hoặc dùng workbook độc lập cho toàn bộ ca.
3. So sánh từng phép tính trung gian, không chỉ tổng cuối.
4. Ghi mã tài liệu nguồn và lưu bản tham chiếu không chứa dữ liệu cá nhân.
5. Kỹ sư/tài chính/pháp lý ký phần phù hợp với trách nhiệm của họ.
6. Tạo tariff version mới; không sửa ngược fixture đã dùng cho phiên bản cũ.
7. Đổi trạng thái fixture sang `APPROVED` trong một thay đổi có review.

## 9. Bảng ký duyệt còn trống

| Vai trò | Người duyệt | Nội dung duyệt | Ngày | Trạng thái |
| --- | --- | --- | --- | --- |
| Chủ sản phẩm | Chưa chỉ định | Ý nghĩa đầu vào/kết quả hiển thị | — | Chưa duyệt |
| Pháp lý/giá điện | Chưa chỉ định | Nguồn, hiệu lực, VAT, bậc giá | — | Chưa duyệt |
| Tài chính | Chưa chỉ định | Làm tròn, đối soát tiền, tolerance | — | Chưa duyệt |
| Kỹ sư điện mặt trời | Chưa chỉ định | Phạm vi sử dụng kết quả trong tư vấn | — | Chưa duyệt |

## 10. Điều kiện đóng Giai đoạn 0

- Contract đầu vào và snapshot có version rõ ràng.
- Mọi calculation mới lưu algorithm version và data versions.
- Dữ liệu demo bị chặn ở production.
- Bộ regression candidate chạy tự động.
- Các ô ký duyệt liên quan đã có người chịu trách nhiệm và bằng chứng nguồn.

Hiện mới đạt phần kỹ thuật candidate; **chưa đạt phần ký duyệt chuyên môn**.

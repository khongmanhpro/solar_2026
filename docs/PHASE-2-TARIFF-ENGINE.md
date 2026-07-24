# Biểu giá, VAT và suy ngược hóa đơn — Giai đoạn 2

Tài liệu này là ranh giới nghiệp vụ cho phép đổi giữa `kWh` và tổng thanh toán.
Mục tiêu là tái lập được phép tính theo đúng phiên bản dữ liệu, đồng thời không
biến thông tin khách hàng chưa biết thành một con số có vẻ chính xác.

## Kết luận pháp lý tại ngày 22/07/2026

- Biểu giá sinh hoạt đang áp dụng là sáu bậc theo
  [Quyết định 1279/QĐ-BCT](https://moit.gov.vn/upload/2005517/fck/files/QD1279-QD-BCT_7917a.pdf),
  hiệu lực từ 10/05/2025 và chưa gồm VAT: `1.984`, `2.050`, `2.380`, `2.998`,
  `3.350`, `3.460` VNĐ/kWh tại các ngưỡng `50`, `100`, `200`, `300`, `400` kWh.
- [Quyết định 14/2025/QĐ-TTg](https://xaydungchinhsach.chinhphu.vn/quyet-dinh-so-14-2025-qd-ttg-quy-dinh-ve-co-cau-bieu-gia-ban-le-dien-119250531090419867.htm)
  quy định cơ cấu năm bậc cho lần điều chỉnh giá tiếp theo. Các mức trong ảnh
  khách cung cấp chỉ là giá suy ra/candidate, chưa phải bảng giá có hiệu lực.
  Dataset giữ bản này ở trạng thái `pending`, không có ngày hiệu lực và không
  cho bộ chọn sử dụng.
- VAT 8% từ 01/07/2025 đến 31/12/2026 được lưu thành quy tắc riêng theo
  [Nghị quyết 204/2025/QH15](https://vanban.chinhphu.vn/?classid=1&docid=214209&pageid=27160)
  và [Nghị định 174/2025/NĐ-CP](https://vanban.chinhphu.vn/?classid=1&docid=214310&pageid=27160&typegroupid=4).
  Phạm vi áp dụng cho điện là kết luận cần người phụ trách pháp lý/tài chính nội
  bộ xác nhận bằng hóa đơn thật trước khi chuyển dataset sang `approved`.
- Ngoài khoảng VAT có dữ liệu, engine báo thiếu quy tắc; không tự đoán 8% hoặc
  10%.

## Nguồn dữ liệu và tính bất biến

Registry nằm tại [`data/electricity-tariffs.json`](../data/electricity-tariffs.json).
Mỗi tariff/VAT record bắt buộc có:

- `version` bất biến; thay đổi bất kỳ giá trị nghiệp vụ nào phải tạo version mới;
- ngày hiệu lực bao gồm cả hai đầu, nguồn chính thức và ghi chú;
- trạng thái vòng đời, trạng thái phê duyệt nội bộ và cờ `selectable`;
- bậc giá, quy tắc hạn mức, quy tắc làm tròn;
- không sửa hoặc xóa record đã từng xuất hiện trong snapshot calculation.

Production chỉ được dùng record `verified`, `approved`, `selectable=true`, nằm
trọn trong kỳ yêu cầu và khớp content hash đã duyệt. Development/test có thể
chạy record draft để kiểm thử, nhưng kết quả phải tiếp tục mang nhãn dữ liệu
chưa duyệt và cổng production vẫn chặn.

## Hợp đồng tính toán

Chiều tính xuôi dùng đúng một cặp `{ tariff, vatRule }`:

```text
tiền điện năng trước VAT = tổng(kWh từng bậc × đơn giá)
VAT = tiền điện năng trước VAT × thuế suất
tổng thanh toán = tiền điện năng trước VAT + VAT + khoản khác
```

Chiều suy ngược nhận `tổng thanh toán` và một khoảng `khoản khác`. Nếu khoản
khác đã xác nhận, hai đầu khoảng bằng nhau và kết quả kWh có thể là một điểm.
Nếu khách chọn `không chắc`, khoảng khoản khác là `0..tổng thanh toán`; engine
trả khoảng kWh rộng và không được trình bày điểm giữa như số đo thật.

Nếu lịch sử đi qua nhiều phiên bản biểu giá, từng hóa đơn vẫn được suy ngược
bằng đúng phiên bản của kỳ đó. Phần dự phóng hóa đơn sau điện mặt trời dùng
phiên bản của kỳ mới nhất, ghi riêng thành `projectionTariffVersion` trong
snapshot và hiển thị cho khách; engine không được fallback về biểu giá legacy.

Hạn mức bậc được nhân theo số hộ và kỳ ghi điện:

```text
quotaScale = số hộ × số ngày thực tế / số ngày tham chiếu
```

Luồng đơn giản chỉ dùng `1 hộ + kỳ bình thường + 0 khoản khác` khi chính khách
chọn câu xác nhận đó. Luồng nâng cao yêu cầu nhập rõ số hộ, khoản khác và cả số
ngày thực tế/tham chiếu khi kỳ ghi điện thay đổi.

## Request khách hàng 2.1.0

Khi nhập tiền, `period` là bắt buộc để chọn tariff/VAT. Khách chỉ trả lời thêm
một câu về hóa đơn; nhánh nâng cao mới mở các trường chi tiết.

```json
{
  "schemaVersion": "2.1.0",
  "energy": {
    "method": "money",
    "amountBasis": "total_payment",
    "billingContext": { "kind": "standard_single_household" },
    "observations": [
      { "period": "2026-06", "totalPaymentVnd": 2160000 }
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

Contract `2.0.0` vẫn đọc được cho snapshot/kWh cũ. Nhánh tiền 2.0.0 bị từ chối
với mã ổn định vì không có xác nhận thành phần hóa đơn.

## Cổng nghiệm thu dữ liệu thật

Không chuyển biểu giá/VAT sang trạng thái được duyệt cho đến khi có đủ:

1. Người chịu trách nhiệm pháp lý/tài chính và thời điểm ký duyệt.
2. Bản lưu văn bản nguồn, URL và hash nội dung đã duyệt.
3. Tối thiểu ba hóa đơn EVN đã ẩn danh ở mức thấp/trung bình/cao.
4. Ca biên tại `50`, `100`, `200`, `300`, `400` kWh và hai phía của mỗi biên.
5. Ca một hộ, nhiều hộ, kỳ ghi điện thay đổi và khoản khác đã biết.
6. Xác nhận thứ tự/quy tắc làm tròn từ hóa đơn thật; sai số tiền trước làm tròn
   không quá 1 VNĐ và round-trip không quá 0,01 kWh khi không có khoản khác.
7. Kiểm thử ngày đầu/cuối hiệu lực, khoảng trống, chồng lấn, hết hạn, pending và
   chưa phê duyệt.

Phần kỹ thuật có thể hoàn tất trước, nhưng chưa được ghi “production ready” nếu
thiếu bất kỳ bằng chứng hoặc chữ ký nào ở trên.

## Lưu dữ liệu khách hàng

Calculation chưa được khách gửi kèm đăng ký khảo sát được dọn sau 30 ngày theo
mặc định. Có thể cấu hình `CALCULATION_RETENTION_DAYS=1..365`; mỗi lần lưu phép
tính mới, repository xóa cứng các calculation quá hạn không có lead. Production
cần chạy `npm run privacy:purge-calculations` hằng ngày để bảo đảm thời hạn ngay
cả khi không có lượt truy cập mới. Calculation đã gắn lead không bị tác vụ này
xóa để tránh làm hỏng hồ sơ khách đã chủ động gửi; thời hạn của lead phải được
chủ dữ liệu phê duyệt riêng trước khi production. Xem
[chính sách dữ liệu khách hàng](CUSTOMER-DATA-RETENTION.md).

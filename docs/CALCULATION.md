# Calculation engine

Tài liệu này mô tả đúng trạng thái thuật toán hiện tại. Đây là công cụ ước tính
MVP, không phải mô phỏng thiết kế kỹ thuật hoặc báo giá chính thức.

## Đầu vào khách hàng và đầu vào engine

| Field | Ý nghĩa |
| --- | --- |
| `energy.method` | `kwh`, `money` hoặc `invoice_ocr` |
| `energy.observations` | 1–12 tháng dữ liệu cùng loại |
| `site.province` | Mã tỉnh/thành để lấy dữ liệu sản lượng |
| `site.daytimeBehavior` | Hành vi sử dụng thiết bị từ 8:00–17:00 |
| `site.roof` | Diện tích đã biết hoặc trạng thái chưa biết |
| `site.backup` | Nhu cầu dự phòng; tải/giờ chỉ có khi cần |

Server chuẩn hóa request thành `monthlyConsumptionKwh`, tiền điện năng cơ sở
trước VAT, mức dùng ban ngày và provenance. Engine không nhận file hóa đơn,
tổng tiền mơ hồ hoặc confidence do client tự khai.

## Biểu giá và suy ngược kWh

`data/electricity-tariffs.json` giữ registry bất biến; selector chọn đúng
tariff/VAT theo kỳ, sau đó `src/lib/electricity-tariff.ts` tính tiền theo từng
bậc:

```text
chi phí bậc = kWh nằm trong bậc × đơn giá bậc
hóa đơn trước VAT = tổng chi phí các bậc
```

Contract 2.1 tách tiền điện năng trước VAT, VAT và khoản khác. Phép tính xuôi và
suy ngược dùng cùng tariff contract, cùng định mức số hộ và tỷ lệ
`billingDays/referenceDays`. Khi khoản khác chưa biết, engine nhận khoảng
`0..tổng thanh toán` và trả khoảng kWh; không biến điểm giữa thành chỉ số đo.

Khi khách nhập kWh, giá trị trung bình đi thẳng vào engine. Hệ thống tính tiền
điện năng cơ sở theo chiều `kWh → tiền`; không gọi phép suy ngược. Tổng tiền phải
thanh toán không bao giờ được coi là tiền trước VAT.

Ba kỳ trở lên chỉ được coi là lịch sử có confidence cao khi các kỳ liên tiếp,
có tháng hợp lệ và kỳ mới nhất không quá hai tháng trước. Dữ liệu cũ hoặc thiếu
tháng không bị biến thành dữ liệu mới; hệ thống hạ confidence và ghi cảnh báo.

Biểu giá đang có nguồn chính thức là 6 bậc QD1279. Bảng 5 bậc trong ảnh là
candidate QD14 tương lai, `selectable=false` và không có ngày hiệu lực. VAT 8%
chỉ được khai trong khoảng 01/07/2025–31/12/2026; ngoài khoảng này engine báo
thiếu dữ liệu. Tariff/VAT vẫn chờ phê duyệt nội bộ và hóa đơn thật đối soát nên
production tiếp tục chặn.

Chi tiết nguồn, contract và checklist nằm tại
[Biểu giá, VAT và suy ngược hóa đơn — Giai đoạn 2](./PHASE-2-TARIFF-ENGINE.md).

## Sản lượng và phụ tải

```text
monthlyConsumptionKwh = average(1..12 monthly kWh observations)
daytimeDemandKwh = monthlyConsumptionKwh × daytimeUsageRatio
adjustedGenerationKwh = baseMonthlyGenerationKwh × provinceFactor
```

Tỷ lệ ban ngày mặc định:

- `low`: 30%
- `medium`: 50%
- `high`: 75%

Đây là giả định cấu hình được trong admin, không phải dữ liệu đo của khách hàng.

## Điện tự dùng và pin lưu trữ

```text
directSolarUse = min(generation, daytimeDemand)
solarSurplus = max(0, generation - directSolarUse)

monthlyBatteryCapacity = batteryKwh
  × 30 ngày
  × dailyCycleFactor
  × roundTripEfficiency

batteryUse = min(
  solarSurplus,
  monthlyBatteryCapacity,
  remainingDemand
)
```

Pin không được phép tạo năng lượng khi không có điện mặt trời dư, và điện xả bị
giới hạn bởi nhu cầu còn lại. Mô hình hiện chưa có SOC dự phòng, DoD riêng, công
suất nạp/xả, suy giảm hoặc dispatch theo giờ.

## Hóa đơn sau solar và tiết kiệm

```text
gridConsumptionAfterSolar = consumption - totalSolarUse
billAfterSolar = tieredBill(gridConsumptionAfterSolar, sameTariffAndQuotaContext)
monthlySavings = originalBill - billAfterSolar
reductionPercent = monthlySavings / originalBill
```

Engine chặn hóa đơn âm và không cho tiết kiệm vượt hóa đơn ban đầu. Điện dư hiện
không tạo doanh thu. Với hóa đơn nhiều hộ hoặc kỳ đổi ngày, hóa đơn sau solar
giữ nguyên version biểu giá, số hộ và tỷ lệ ngày đã dùng cho hóa đơn nền.

## Ba kịch bản

- Thận trọng: sản lượng × `lowEstimateFactor`.
- Tiêu chuẩn: sản lượng đã điều chỉnh theo tỉnh.
- Thuận lợi: sản lượng × `highEstimateFactor`.

Mỗi kịch bản được tính lại đầy đủ điện tự dùng, pin, hóa đơn và hoàn vốn; không
chỉ nhân kết quả cuối cùng với hệ số.

## Dòng tiền và hoàn vốn

```text
yearlySavings = monthlySavings × 12
paybackYears = packagePrice / yearlySavings
cumulativeCashFlow(year) = -packagePrice + yearlySavings × year
```

Dòng tiền tạo từ năm 0 đến năm 20. Phiên bản hiện tại chưa đưa vào O&M, vệ sinh,
suy giảm sản lượng, tăng giá điện, thay inverter/pin, thuế, lãi vay hoặc discount
rate. Vì vậy thời gian hoàn vốn chỉ là ước tính đơn giản.

## Lọc và xếp hạng package

Package không hợp lệ khi:

- `active=false`.
- Khách biết diện tích mái và diện tích package yêu cầu lớn hơn mái đó.
- Khách cần dự phòng nhưng package không phải hybrid có pin.

Score hiện tại:

```text
score = generationFitScore × 50%
      + selfUseScore × 30%
      + paybackScore × 20%
```

Khi bằng điểm và khách không cần dự phòng, hòa lưới được ưu tiên. Kết quả trả tối
đa ba package.

Nếu khách không biết diện tích mái, hệ thống không lọc theo một diện tích giả.
Kết quả phải ghi cần khảo sát và không được khẳng định package chắc chắn lắp
được. Tải thiết yếu/số giờ Giai đoạn 1 chỉ được lưu để khảo sát; chưa dùng để
hứa thời gian dự phòng khi thiếu thông số pin Giai đoạn 5.

## Nguyên tắc nâng cấp

Lõi V2 nên giữ các nguyên tắc sau:

1. Business logic thuần TypeScript, độc lập UI/database.
2. Mọi biểu giá, nguồn sản lượng và package có phiên bản, nguồn và ngày hiệu lực.
3. Một input chuẩn hóa cho ba nguồn: hóa đơn, kWh hoặc số tiền.
4. Tính sản lượng 12 tháng hoặc theo giờ thay cho một hệ số tháng cố định.
5. Mô phỏng phụ tải và battery dispatch theo thời gian.
6. Trả khoảng kết quả và confidence level thay vì một số tuyệt đối.
7. Snapshot lưu đầy đủ input, data version và algorithm version để tái lập.

## Nghiệm thu

Trước khi công bố cần có ca được kỹ sư phê duyệt bao phủ:

- Biên từng bậc giá điện.
- Hóa đơn thấp, trung bình và cao.
- Mái nhỏ, mái lớn và mái bị che bóng.
- Dùng điện chủ yếu ban ngày và chủ yếu ban đêm.
- Hòa lưới và hybrid.
- So sánh dự báo với phần mềm kỹ thuật hoặc hệ thống đang vận hành.

Quy tắc tolerance, trạng thái dữ liệu và bộ ca biên biểu giá candidate được mô
tả tại [Accuracy charter Giai đoạn 0](./ACCURACY-ACCEPTANCE.md). Bộ ca hiện tại
chỉ là engineering regression và chưa được coi là golden set đã qua ký duyệt.

# Calculation engine

Tài liệu này mô tả đúng trạng thái thuật toán hiện tại. Đây là công cụ ước tính
MVP, không phải mô phỏng thiết kế kỹ thuật hoặc báo giá chính thức.

## Đầu vào

| Field | Ý nghĩa |
| --- | --- |
| `monthlyBill` | Tiền điện trung bình trước VAT |
| `electricityType` | Hiện chỉ có `residential` |
| `province` | Mã tỉnh/thành để lấy hệ số sản lượng |
| `daytimeUsageLevel` | `low`, `medium` hoặc `high` |
| `roofAreaM2` | Diện tích mái khả dụng |
| `backupRequired` | Có yêu cầu điện dự phòng hay không |

## Biểu giá và suy ngược kWh

`src/lib/electricity-tariff.ts` tính tiền theo từng bậc:

```text
chi phí bậc = kWh nằm trong bậc × đơn giá bậc
hóa đơn trước VAT = tổng chi phí các bậc
```

Khi đầu vào là tiền điện trước VAT, engine đi lần lượt qua từng bậc để suy ngược
số kWh. Phép tính này đảo đúng hàm tính hóa đơn trong phạm vi biểu giá hệ thống,
nhưng chưa xử lý VAT, số ngày ghi điện khác chuẩn, số hộ dùng chung hoặc phụ phí.

Biểu giá hiện nằm trong `src/config/electricity-tariffs.ts` và phải được xác minh
nguồn, ngày hiệu lực trước khi sử dụng thật.

## Sản lượng và phụ tải

```text
monthlyConsumptionKwh = inverseTariff(monthlyBill)
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
billAfterSolar = tieredBill(gridConsumptionAfterSolar)
monthlySavings = originalBill - billAfterSolar
reductionPercent = monthlySavings / originalBill
```

Engine chặn hóa đơn âm và không cho tiết kiệm vượt hóa đơn ban đầu. Điện dư hiện
không tạo doanh thu.

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
- Diện tích mái yêu cầu lớn hơn mái khách hàng.
- Khách cần dự phòng nhưng package không phải hybrid có pin.

Score hiện tại:

```text
score = generationFitScore × 50%
      + selfUseScore × 30%
      + paybackScore × 20%
```

Khi bằng điểm và khách không cần dự phòng, hòa lưới được ưu tiên. Kết quả trả tối
đa ba package.

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

# NHIỆM VỤ: XÂY DỰNG MVP CÔNG CỤ TÍNH TOÁN ĐIỆN MẶT TRỜI

Bạn là một senior full-stack engineer kiêm product engineer.

Hãy xây dựng một ứng dụng web MVP bằng tiếng Việt giúp khách hàng nhập thông tin tiền điện và mái nhà, sau đó nhận được:

- Gói điện mặt trời phù hợp.
- Chi phí đầu tư.
- Công suất hệ thống.
- Sản lượng điện dự kiến.
- Tiền tiết kiệm mỗi tháng.
- Hóa đơn còn lại.
- Tỷ lệ giảm hóa đơn.
- Thời gian hoàn vốn.
- So sánh ba gói.
- Form đăng ký khảo sát.

Không được làm mơ hồ. Thực hiện đúng từng bước bên dưới.

---

# 1. NGUYÊN TẮC LÀM VIỆC

Trước khi viết code:

1. Kiểm tra toàn bộ repository hiện tại.
2. Xác định công nghệ đang được sử dụng.
3. Không thay đổi framework nếu repository đã có sẵn framework phù hợp.
4. Nếu repository trống, sử dụng:
   - Next.js App Router.
   - TypeScript.
   - Tailwind CSS.
   - Prisma.
   - SQLite cho môi trường local.
   - Zod để kiểm tra dữ liệu.
   - Recharts hoặc thư viện biểu đồ tương đương.
   - Vitest hoặc công cụ kiểm thử hiện có trong repository.
5. Bật TypeScript strict mode.
6. Không đặt business logic trực tiếp trong React component.
7. Tất cả công thức tính toán phải nằm trong một module riêng.
8. Tất cả giá trị mặc định phải nằm trong file cấu hình hoặc database.
9. Không hard-code dữ liệu sản phẩm trong component giao diện.
10. Sau mỗi bước phải:
    - Chạy lint.
    - Chạy type-check.
    - Chạy test liên quan.
    - Sửa toàn bộ lỗi trước khi sang bước tiếp theo.

Không hỏi lại người dùng trừ khi thiếu thông tin khiến dự án hoàn toàn không thể chạy. Với các chi tiết nhỏ chưa được chỉ định, hãy dùng mặc định trong tài liệu này và ghi lại trong README.

---

# 2. PHẠM VI MVP

Ứng dụng gồm ba phần:

1. Trang công cụ dành cho khách hàng.
2. Trang kết quả tính toán.
3. Trang quản trị đơn giản.

MVP không làm các chức năng sau:

- Không đọc hóa đơn bằng OCR.
- Không phân tích ảnh mái bằng AI.
- Không dùng ảnh vệ tinh.
- Không mô phỏng bóng râm 3D.
- Không tích hợp thanh toán.
- Không tích hợp trực tiếp hệ thống inverter.
- Không tích hợp API Zalo thật.
- Không tính biểu giá điện bậc thang phức tạp.
- Không dùng dữ liệu bức xạ thời gian thực.
- Không làm ứng dụng điện thoại riêng.
- Không xây dựng hệ thống CRM phức tạp.

Nút Zalo trong MVP chỉ mở một đường dẫn Zalo được cấu hình trong biến môi trường hoặc phần quản trị.

---

# 3. GIAO DIỆN TỔNG THỂ

Thiết kế giao diện dựa theo bố cục sau:

## Desktop

Chia thành hai cột:

### Cột trái

- Form đầu vào.
- Khối giả định tính toán.
- Khối “Vì sao nên chọn chúng tôi”.
- Nút tính toán.

### Cột phải

- Gói được đề xuất.
- Các chỉ số tiết kiệm.
- Biểu đồ hoàn vốn.
- So sánh ba gói.
- Danh sách thiết bị.
- Cam kết dịch vụ.
- Nút đăng ký khảo sát.
- Nút tư vấn Zalo.

## Mobile

- Hiển thị một cột.
- Form đầu vào xuất hiện trước.
- Kết quả xuất hiện ngay bên dưới.
- Các bảng so sánh chuyển thành thẻ dọc.
- Không có nội dung bị tràn ngang.

Phong cách:

- Hiện đại.
- Tin cậy.
- Sạch sẽ.
- Màu chính xanh dương và xanh lá.
- Nền trắng hoặc xám rất nhạt.
- Card bo góc.
- Khoảng cách rộng, dễ đọc.
- Không dùng hiệu ứng rườm rà.
- Tất cả nội dung bằng tiếng Việt.

---

# 4. INPUT CỦA KHÁCH HÀNG

Form khách hàng chỉ có năm input chính.

## Input 1: Tiền điện trung bình mỗi tháng

Tên field:

`monthlyBill`

Kiểu dữ liệu:

`number`

Đơn vị:

`VND/tháng`

Bắt buộc:

Có.

Giới hạn:

- Tối thiểu: 100.000.
- Tối đa: 500.000.000.

Giá trị mẫu:

`2000000`

Thông báo lỗi:

- “Vui lòng nhập tiền điện trung bình mỗi tháng.”
- “Tiền điện phải lớn hơn hoặc bằng 100.000 đồng.”
- “Giá trị tiền điện không hợp lệ.”

---

## Input 2: Tỉnh hoặc thành phố

Tên field:

`province`

Kiểu dữ liệu:

`select`

Bắt buộc:

Có.

Dữ liệu MVP:

- Hồ Chí Minh.
- Hà Nội.
- Đà Nẵng.
- Cần Thơ.
- Bình Dương.
- Đồng Nai.
- Long An.
- Tỉnh/thành khác.

Mỗi tỉnh có một hệ số sản lượng.

Dữ liệu mặc định:

```ts
{
  "ho-chi-minh": 1.0,
  "ha-noi": 0.88,
  "da-nang": 0.95,
  "can-tho": 1.02,
  "binh-duong": 1.0,
  "dong-nai": 1.0,
  "long-an": 1.01,
  "other": 0.92
}
```

Các giá trị này chỉ là dữ liệu mẫu và phải chỉnh sửa được trong trang quản trị.

---

## Input 3: Mức sử dụng điện ban ngày

Tên field:

`daytimeUsageLevel`

Kiểu dữ liệu:

`enum`

Các lựa chọn:

```ts
type DaytimeUsageLevel = "low" | "medium" | "high";
```

Quy đổi:

```ts
{
  low: 0.3,
  medium: 0.5,
  high: 0.75
}
```

Nhãn hiển thị:

- Ít, dưới 30%.
- Trung bình, khoảng 30–60%.
- Nhiều, trên 60%.

Giải thích:

“Điện ban ngày là điện sử dụng trong thời gian hệ thống điện mặt trời đang phát điện.”

---

## Input 4: Diện tích mái có thể lắp

Tên field:

`roofAreaM2`

Kiểu dữ liệu:

`number`

Đơn vị:

`m²`

Bắt buộc:

Có.

Giới hạn:

- Tối thiểu: 5 m².
- Tối đa: 10.000 m².

Thông báo lỗi:

- “Vui lòng nhập diện tích mái.”
- “Diện tích mái phải từ 5 m² trở lên.”

---

## Input 5: Có cần điện khi mất điện không?

Tên field:

`backupRequired`

Kiểu dữ liệu:

`boolean`

Lựa chọn:

- Không cần.
- Có cần.

Quy tắc:

- Nếu chọn “Không cần”, ưu tiên gói hòa lưới.
- Nếu chọn “Có cần”, chỉ đề xuất gói có pin lưu trữ.
- Nếu không có gói phù hợp, hiển thị yêu cầu khảo sát thay vì đề xuất sai.

---

# 5. INPUT THÔNG TIN KHÁCH HÀNG TIỀM NĂNG

Không yêu cầu khách nhập số điện thoại trước khi xem kết quả.

Sau khi xem kết quả, hiển thị form đăng ký khảo sát gồm:

## Họ và tên

Field:

`fullName`

Bắt buộc:

Có.

## Số điện thoại

Field:

`phone`

Bắt buộc:

Có.

Kiểm tra định dạng số điện thoại Việt Nam ở mức cơ bản.

## Địa chỉ công trình

Field:

`address`

Bắt buộc:

Không.

## Thời gian muốn được liên hệ

Field:

`preferredContactTime`

Các lựa chọn:

- Buổi sáng.
- Buổi chiều.
- Buổi tối.
- Liên hệ bất kỳ lúc nào.

## Ghi chú

Field:

`note`

Bắt buộc:

Không.

Khi gửi form, phải lưu:

- Thông tin khách.
- Toàn bộ input tính toán.
- Gói được đề xuất.
- Kết quả tính toán.
- Thời gian gửi.

---

# 6. DỮ LIỆU GÓI SẢN PHẨM

Tạo model `SolarPackage`.

Các trường bắt buộc:

```ts
type SolarSystemType = "grid-tied" | "hybrid";

interface SolarPackage {
  id: string;
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  capacityKwp: number;
  baseMonthlyGenerationKwh: number;
  requiredRoofAreaM2: number;
  systemType: SolarSystemType;
  batteryCapacityKwh: number;
  equipmentSummary: string;
  panelBrand: string;
  panelModel: string;
  inverterBrand: string;
  inverterModel: string;
  panelWarrantyYears: number;
  inverterWarrantyYears: number;
  active: boolean;
  displayOrder: number;
}
```

Tạo dữ liệu mẫu sau:

## Gói 1

```ts
{
  code: "SAVE-2KWP",
  name: "Gói tiết kiệm 2 kWp",
  description: "Phù hợp khách có ngân sách thấp và nhu cầu điện ban ngày vừa phải.",
  priceVnd: 18000000,
  capacityKwp: 2,
  baseMonthlyGenerationKwh: 240,
  requiredRoofAreaM2: 12,
  systemType: "grid-tied",
  batteryCapacityKwh: 0,
  equipmentSummary: "Tấm pin, inverter hòa lưới, khung, tủ điện và thi công tiêu chuẩn.",
  panelBrand: "Thương hiệu mẫu",
  panelModel: "550Wp",
  inverterBrand: "Thương hiệu mẫu",
  inverterModel: "2kW Grid-tied",
  panelWarrantyYears: 12,
  inverterWarrantyYears: 5,
  active: true,
  displayOrder: 1
}
```

## Gói 2

```ts
{
  code: "FIT-3KWP",
  name: "Gói phù hợp 3 kWp",
  description: "Cân bằng giữa chi phí đầu tư, sản lượng và thời gian hoàn vốn.",
  priceVnd: 30000000,
  capacityKwp: 3,
  baseMonthlyGenerationKwh: 360,
  requiredRoofAreaM2: 18,
  systemType: "grid-tied",
  batteryCapacityKwh: 0,
  equipmentSummary: "Tấm pin, inverter hòa lưới, khung, tủ điện, giám sát và thi công.",
  panelBrand: "Thương hiệu mẫu",
  panelModel: "550Wp",
  inverterBrand: "Thương hiệu mẫu",
  inverterModel: "3kW Grid-tied",
  panelWarrantyYears: 12,
  inverterWarrantyYears: 5,
  active: true,
  displayOrder: 2
}
```

## Gói 3

```ts
{
  code: "MAX-5KWP",
  name: "Gói nâng cao 5 kWp",
  description: "Phù hợp khách có tiền điện cao và diện tích mái lớn.",
  priceVnd: 50000000,
  capacityKwp: 5,
  baseMonthlyGenerationKwh: 600,
  requiredRoofAreaM2: 30,
  systemType: "grid-tied",
  batteryCapacityKwh: 0,
  equipmentSummary: "Tấm pin, inverter hòa lưới, khung, tủ điện, giám sát và thi công.",
  panelBrand: "Thương hiệu mẫu",
  panelModel: "550Wp",
  inverterBrand: "Thương hiệu mẫu",
  inverterModel: "5kW Grid-tied",
  panelWarrantyYears: 12,
  inverterWarrantyYears: 5,
  active: true,
  displayOrder: 3
}
```

## Gói 4

```ts
{
  code: "HYBRID-3KWP-5KWH",
  name: "Gói Hybrid 3 kWp và pin 5 kWh",
  description: "Phù hợp khách cần điện dự phòng khi mất điện.",
  priceVnd: 48000000,
  capacityKwp: 3,
  baseMonthlyGenerationKwh: 360,
  requiredRoofAreaM2: 18,
  systemType: "hybrid",
  batteryCapacityKwh: 5,
  equipmentSummary: "Tấm pin, inverter hybrid, pin lưu trữ 5 kWh, khung, tủ điện và thi công.",
  panelBrand: "Thương hiệu mẫu",
  panelModel: "550Wp",
  inverterBrand: "Thương hiệu mẫu",
  inverterModel: "3kW Hybrid",
  panelWarrantyYears: 12,
  inverterWarrantyYears: 5,
  active: true,
  displayOrder: 4
}
```

Tất cả dữ liệu này phải được seed vào database và có thể sửa trong trang quản trị.

---

# 7. CẤU HÌNH TÍNH TOÁN

Tạo model hoặc cấu hình `CalculationSettings`.

Các giá trị mặc định:

```ts
interface CalculationSettings {
  averageElectricityPriceVndPerKwh: number;
  batteryRoundTripEfficiency: number;
  batteryDailyCycleFactor: number;
  lowEstimateFactor: number;
  highEstimateFactor: number;
  systemLifetimeYears: number;
  maintenanceRatePerYear: number;
}
```

Giá trị mặc định:

```ts
{
  averageElectricityPriceVndPerKwh: 2800,
  batteryRoundTripEfficiency: 0.9,
  batteryDailyCycleFactor: 1,
  lowEstimateFactor: 0.9,
  highEstimateFactor: 1.05,
  systemLifetimeYears: 20,
  maintenanceRatePerYear: 0
}
```

Các giá trị phải sửa được trong trang quản trị.

---

# 8. MODULE TÍNH TOÁN

Tạo file riêng:

```text
src/lib/solar-calculator.ts
```

Không đặt công thức trong component giao diện hoặc API route.

Tạo các type rõ ràng:

```ts
interface SolarCalculationInput {
  monthlyBill: number;
  province: string;
  daytimeUsageLevel: DaytimeUsageLevel;
  roofAreaM2: number;
  backupRequired: boolean;
}

interface PackageCalculationResult {
  packageId: string;
  adjustedGenerationKwh: number;
  estimatedMonthlyConsumptionKwh: number;
  daytimeDemandKwh: number;
  directSolarUseKwh: number;
  batteryUseKwh: number;
  totalSolarUseKwh: number;
  gridConsumptionAfterSolarKwh: number;
  monthlySavingsVnd: number;
  billAfterSolarVnd: number;
  reductionPercent: number;
  yearlySavingsVnd: number;
  paybackMonths: number | null;
  paybackYears: number | null;
  selfConsumptionRate: number;
  score: number;
}
```

---

# 9. CÔNG THỨC TÍNH CHÍNH XÁC CHO MVP

Thực hiện đúng thứ tự sau.

## Bước 1: Ước tính điện tiêu thụ

```ts
estimatedMonthlyConsumptionKwh =
  monthlyBill / averageElectricityPriceVndPerKwh;
```

Ví dụ:

```ts
2000000 / 2800 = 714.2857 kWh
```

Không làm tròn trong quá trình tính. Chỉ làm tròn khi hiển thị.

---

## Bước 2: Tính điện dùng ban ngày

```ts
daytimeDemandKwh =
  estimatedMonthlyConsumptionKwh * daytimeUsageRatio;
```

Trong đó:

```ts
low = 0.3;
medium = 0.5;
high = 0.75;
```

---

## Bước 3: Điều chỉnh sản lượng theo tỉnh

```ts
adjustedGenerationKwh =
  package.baseMonthlyGenerationKwh * provinceFactor;
```

Ví dụ:

```ts
360 * 0.88 = 316.8 kWh
```

---

## Bước 4: Tính điện mặt trời dùng trực tiếp

```ts
directSolarUseKwh =
  Math.min(adjustedGenerationKwh, daytimeDemandKwh);
```

---

## Bước 5: Tính điện dư

```ts
solarSurplusKwh =
  Math.max(0, adjustedGenerationKwh - directSolarUseKwh);
```

---

## Bước 6: Tính điện lấy lại từ pin

Nếu gói không có pin:

```ts
batteryUseKwh = 0;
```

Nếu gói có pin:

```ts
monthlyBatteryDischargeCapacityKwh =
  package.batteryCapacityKwh *
  30 *
  batteryDailyCycleFactor *
  batteryRoundTripEfficiency;
```

Sau đó:

```ts
remainingDemandKwh =
  Math.max(
    0,
    estimatedMonthlyConsumptionKwh - directSolarUseKwh
  );
```

```ts
batteryUseKwh =
  Math.min(
    solarSurplusKwh,
    monthlyBatteryDischargeCapacityKwh,
    remainingDemandKwh
  );
```

Không được tính điện từ pin lớn hơn lượng điện mặt trời dư.

---

## Bước 7: Tổng điện mặt trời khách sử dụng được

```ts
totalSolarUseKwh =
  directSolarUseKwh + batteryUseKwh;
```

Giới hạn:

```ts
totalSolarUseKwh <= estimatedMonthlyConsumptionKwh;
```

---

## Bước 8: Điện còn mua từ lưới

```ts
gridConsumptionAfterSolarKwh =
  Math.max(
    0,
    estimatedMonthlyConsumptionKwh - totalSolarUseKwh
  );
```

---

## Bước 9: Tiền tiết kiệm mỗi tháng

```ts
rawMonthlySavingsVnd =
  totalSolarUseKwh * averageElectricityPriceVndPerKwh;
```

Giới hạn:

```ts
monthlySavingsVnd =
  Math.min(monthlyBill, rawMonthlySavingsVnd);
```

Tiền tiết kiệm không được lớn hơn hóa đơn hiện tại.

---

## Bước 10: Hóa đơn còn lại

```ts
billAfterSolarVnd =
  Math.max(0, monthlyBill - monthlySavingsVnd);
```

---

## Bước 11: Tỷ lệ giảm hóa đơn

```ts
reductionPercent =
  monthlyBill > 0
    ? (monthlySavingsVnd / monthlyBill) * 100
    : 0;
```

Giới hạn từ 0 đến 100.

---

## Bước 12: Tiết kiệm mỗi năm

```ts
yearlySavingsVnd =
  monthlySavingsVnd * 12;
```

---

## Bước 13: Thời gian hoàn vốn

Nếu `monthlySavingsVnd <= 0`:

```ts
paybackMonths = null;
paybackYears = null;
```

Nếu lớn hơn 0:

```ts
paybackMonths =
  package.priceVnd / monthlySavingsVnd;
```

```ts
paybackYears =
  paybackMonths / 12;
```

---

## Bước 14: Tỷ lệ điện mặt trời được tự sử dụng

```ts
selfConsumptionRate =
  adjustedGenerationKwh > 0
    ? totalSolarUseKwh / adjustedGenerationKwh
    : 0;
```

Giới hạn từ 0 đến 1.

---

# 10. KHOẢNG ƯỚC TÍNH THẤP VÀ CAO

Ngoài kết quả tiêu chuẩn, hiển thị khoảng dự kiến.

## Sản lượng thấp

```ts
lowGeneration =
  adjustedGenerationKwh * lowEstimateFactor;
```

## Sản lượng cao

```ts
highGeneration =
  adjustedGenerationKwh * highEstimateFactor;
```

Với mặc định:

```ts
lowEstimateFactor = 0.9;
highEstimateFactor = 1.05;
```

Áp dụng lại cùng công thức để tính:

- Tiết kiệm thấp.
- Tiết kiệm cao.
- Hóa đơn thấp.
- Hóa đơn cao.
- Hoàn vốn nhanh.
- Hoàn vốn chậm.

Không được chỉ nhân thời gian hoàn vốn với hệ số. Phải tính lại từ mức tiết kiệm thấp và cao.

---

# 11. LOGIC LỌC GÓI

Một gói chỉ đủ điều kiện khi:

```ts
package.active === true
```

Và:

```ts
package.requiredRoofAreaM2 <= input.roofAreaM2
```

Nếu khách cần điện dự phòng:

```ts
package.systemType === "hybrid"
```

Nếu khách không cần điện dự phòng:

- Chấp nhận gói `grid-tied`.
- Có thể hiển thị gói `hybrid` như lựa chọn nâng cao.
- Không chọn gói hybrid làm gói mặc định nếu gói hòa lưới phù hợp hơn.

Nếu không có gói đủ điều kiện:

- Không tự chọn gói sai.
- Hiển thị thông báo:
  “Chưa tìm thấy gói phù hợp hoàn toàn. Vui lòng đăng ký khảo sát để được tư vấn cấu hình riêng.”
- Vẫn hiển thị form đăng ký khảo sát.

---

# 12. LOGIC CHẤM ĐIỂM VÀ ĐỀ XUẤT GÓI

Tính `targetGenerationKwh`.

Nếu khách không cần điện dự phòng:

```ts
targetGenerationKwh =
  daytimeDemandKwh * 0.8;
```

Mục tiêu là đáp ứng khoảng 80% nhu cầu điện ban ngày để hạn chế điện dư.

Nếu khách cần điện dự phòng:

```ts
targetGenerationKwh =
  estimatedMonthlyConsumptionKwh * 0.7;
```

Tính `generationFitScore`:

```ts
generationFitScore =
  targetGenerationKwh > 0
    ? Math.max(
        0,
        100 -
          (Math.abs(
            adjustedGenerationKwh - targetGenerationKwh
          ) /
            targetGenerationKwh) *
            100
      )
    : 0;
```

Tính `selfUseScore`:

```ts
selfUseScore =
  selfConsumptionRate * 100;
```

Tính `paybackScore`:

```ts
paybackScore =
  paybackYears !== null
    ? Math.max(0, 100 - paybackYears * 15)
    : 0;
```

Điểm cuối:

```ts
score =
  generationFitScore * 0.5 +
  selfUseScore * 0.3 +
  paybackScore * 0.2;
```

Quy tắc chọn:

1. Lọc các gói đủ điều kiện.
2. Tính kết quả cho từng gói.
3. Sắp xếp theo `score` giảm dần.
4. Gói có điểm cao nhất là “Phù hợp nhất”.
5. Hiển thị tối đa ba gói có điểm cao nhất.
6. Nếu có ít hơn ba gói, chỉ hiển thị số gói thực tế.

Không được tự sửa giá hoặc công suất gói để làm gói phù hợp hơn.

---

# 13. OUTPUT PHẢI HIỂN THỊ

## Khối 1: Gói đề xuất

Hiển thị:

- Nhãn “Gói đề xuất cho bạn”.
- Tên gói.
- Nhãn “Phù hợp nhất”.
- Mô tả ngắn.
- Công suất kWp.
- Sản lượng dự kiến theo khoảng.
- Diện tích mái cần.
- Loại hệ thống.
- Dung lượng pin nếu có.

---

## Khối 2: Hiệu quả tiết kiệm

Hiển thị sáu thẻ:

1. Tiền điện hiện tại.
2. Tiền điện sau khi lắp.
3. Tiết kiệm mỗi tháng.
4. Tiết kiệm mỗi năm.
5. Tỷ lệ giảm hóa đơn.
6. Tỷ lệ điện mặt trời được tự sử dụng.

Định dạng:

- Tiền dùng `Intl.NumberFormat("vi-VN")`.
- kWh hiển thị tối đa một chữ số thập phân.
- Phần trăm hiển thị tối đa một chữ số thập phân.
- Thời gian hoàn vốn hiển thị tối đa một chữ số thập phân.

---

## Khối 3: Hoàn vốn và lợi ích dài hạn

Hiển thị:

- Thời gian hoàn vốn dự kiến theo khoảng.
- Tiết kiệm sau 5 năm.
- Tiết kiệm sau 10 năm.
- Tiết kiệm sau 20 năm.

Công thức MVP:

```ts
saving5Years = yearlySavingsVnd * 5;
saving10Years = yearlySavingsVnd * 10;
saving20Years = yearlySavingsVnd * 20;
```

Ghi chú rõ:

“Chưa bao gồm biến động giá điện, suy giảm thiết bị và chi phí phát sinh.”

---

## Khối 4: Biểu đồ dòng tiền

Dữ liệu biểu đồ:

- Năm 0: `-package.priceVnd`.
- Mỗi năm tiếp theo cộng `yearlySavingsVnd`.
- Hiển thị từ năm 0 đến năm 20.
- Đánh dấu năm đầu tiên dòng tiền tích lũy lớn hơn hoặc bằng 0.
- Tooltip dùng định dạng tiền Việt Nam.

---

## Khối 5: So sánh ba gói

Mỗi card hiển thị:

- Tên gói.
- Công suất.
- Giá.
- Sản lượng dự kiến.
- Tiền tiết kiệm mỗi tháng.
- Hóa đơn còn lại.
- Thời gian hoàn vốn.
- Có pin lưu trữ hay không.
- Diện tích mái.
- Nút “Chọn gói này”.

Gói được đề xuất phải nổi bật bằng viền xanh và nhãn “Đề xuất”.

---

## Khối 6: Thiết bị sử dụng

Hiển thị:

- Tấm pin.
- Model tấm pin.
- Inverter.
- Model inverter.
- Pin lưu trữ nếu có.
- Bảo hành tấm pin.
- Bảo hành inverter.
- Mô tả vật tư đi kèm.

Không sử dụng hình ảnh có bản quyền không rõ nguồn gốc.

Trong MVP có thể dùng icon hoặc hình placeholder nội bộ.

---

## Khối 7: Nhận xét tự động

Tạo một hàm riêng sinh nhận xét.

Ví dụ khi dùng ban ngày cao:

“Bạn sử dụng nhiều điện vào ban ngày nên hệ thống hòa lưới có khả năng mang lại hiệu quả tiết kiệm tốt.”

Ví dụ khi mái nhỏ:

“Diện tích mái hiện tại giới hạn số lượng tấm pin có thể lắp. Gói được đề xuất đã được chọn trong phạm vi diện tích mái bạn cung cấp.”

Ví dụ có pin:

“Bạn chọn nhu cầu điện dự phòng nên hệ thống ưu tiên inverter hybrid và pin lưu trữ.”

Ví dụ có nhiều điện dư:

“Hệ thống có thể tạo ra một phần điện dư. Mức tiết kiệm thực tế phụ thuộc vào khả năng sử dụng điện trong thời gian hệ thống phát điện.”

Không dùng từ:

- “Cam kết chắc chắn”.
- “Chính xác tuyệt đối”.
- “Không còn tiền điện”.
- “Chắc chắn hòa vốn”.

---

# 14. NỘI DUNG CẢNH BÁO

Luôn hiển thị cuối kết quả:

“Kết quả là ước tính dựa trên thông tin khách hàng cung cấp, dữ liệu sản phẩm và các giả định tính toán hiện tại. Sản lượng và chi phí thực tế có thể thay đổi theo thời tiết, hướng mái, độ che bóng, kết cấu mái, biểu giá điện và điều kiện thi công. Báo giá chính thức được xác nhận sau khi khảo sát công trình.”

---

# 15. TRANG QUẢN TRỊ

Tạo các route:

```text
/admin
/admin/packages
/admin/settings
/admin/leads
```

Trang quản trị phải được bảo vệ bằng cơ chế đăng nhập đơn giản.

Nếu dự án chưa có hệ thống authentication, dùng tài khoản quản trị cấu hình qua biến môi trường:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
```

Không lưu mật khẩu quản trị dạng plain text trong source code.

---

## Quản lý gói

Cho phép:

- Xem danh sách.
- Thêm gói.
- Sửa gói.
- Bật hoặc tắt gói.
- Thay đổi thứ tự hiển thị.
- Thay giá.
- Thay công suất.
- Thay sản lượng.
- Thay diện tích mái.
- Thay thiết bị.
- Thay bảo hành.

Không xóa cứng gói đã được dùng trong calculation. Chỉ chuyển `active` thành false.

---

## Quản lý cấu hình

Cho phép sửa:

- Giá điện trung bình.
- Hệ số tỉnh.
- Tỷ lệ dùng điện ban ngày.
- Hiệu suất pin.
- Hệ số ước tính thấp.
- Hệ số ước tính cao.
- Link Zalo.
- Hotline.
- Tên doanh nghiệp.

---

## Quản lý khách hàng tiềm năng

Hiển thị:

- Họ tên.
- Số điện thoại.
- Địa chỉ.
- Thời gian muốn liên hệ.
- Tiền điện.
- Khu vực.
- Gói đề xuất.
- Ngày đăng ký.
- Trạng thái.

Trạng thái:

```ts
type LeadStatus =
  | "new"
  | "contacted"
  | "survey_scheduled"
  | "quoted"
  | "won"
  | "lost";
```

Cho phép cập nhật trạng thái.

---

# 16. DATABASE

Tạo ít nhất các model sau.

## SolarPackage

Lưu gói sản phẩm.

## CalculationSetting

Lưu cấu hình tính toán.

## ProvinceFactor

Lưu hệ số sản lượng theo tỉnh.

## Calculation

Lưu từng lần tính toán.

Các trường chính:

```ts
id
monthlyBill
province
daytimeUsageLevel
roofAreaM2
backupRequired
recommendedPackageId
resultJson
createdAt
```

## Lead

Các trường:

```ts
id
fullName
phone
address
preferredContactTime
note
status
calculationId
createdAt
updatedAt
```

Mỗi lead phải liên kết với một calculation.

---

# 17. API HOẶC SERVER ACTION

Tạo các chức năng sau:

## Tính toán

Input:

```ts
SolarCalculationInput
```

Output:

```ts
{
  recommendedPackage: PackageCalculationResult | null;
  comparedPackages: PackageCalculationResult[];
  inputSummary: SolarCalculationInput;
  assumptions: CalculationSettings;
}
```

## Tạo lead

Input:

```ts
{
  fullName: string;
  phone: string;
  address?: string;
  preferredContactTime: string;
  note?: string;
  calculationId: string;
}
```

## Quản lý package

- Create.
- Read.
- Update.
- Disable.

## Quản lý settings

- Read.
- Update.

Tất cả input phía server phải kiểm tra lại bằng Zod. Không chỉ kiểm tra phía client.

---

# 18. CẤU TRÚC FILE ĐỀ XUẤT

Nếu dùng Next.js, ưu tiên cấu trúc:

```text
src/
  app/
    page.tsx
    api/
    admin/
  components/
    calculator/
      CalculatorForm.tsx
      CalculationResults.tsx
      RecommendedPackageCard.tsx
      SavingsSummary.tsx
      PaybackChart.tsx
      PackageComparison.tsx
      EquipmentList.tsx
      LeadForm.tsx
    admin/
  lib/
    solar-calculator.ts
    solar-recommendation.ts
    formatters.ts
    validations.ts
    db.ts
  types/
    solar.ts
  config/
    defaults.ts
prisma/
  schema.prisma
  seed.ts
tests/
  solar-calculator.test.ts
  solar-recommendation.test.ts
```

Có thể điều chỉnh theo cấu trúc repository hiện tại nhưng phải giữ việc phân tách trách nhiệm.

---

# 19. TRẠNG THÁI GIAO DIỆN

Phải triển khai đầy đủ:

- Form chưa nhập.
- Form có lỗi.
- Đang tính toán.
- Tính toán thành công.
- Không có gói phù hợp.
- Lỗi server.
- Đang gửi lead.
- Gửi lead thành công.
- Gửi lead thất bại.
- Không có dữ liệu package.
- Biểu đồ không có dữ liệu.

Không được để màn hình trắng khi xảy ra lỗi.

---

# 20. ACCESSIBILITY

Đảm bảo:

- Tất cả input có label.
- Có thể sử dụng bằng bàn phím.
- Nút có trạng thái focus rõ ràng.
- Lỗi form liên kết đúng input.
- Màu chữ có độ tương phản tốt.
- Không chỉ dùng màu sắc để biểu thị trạng thái.
- Icon có aria-label hoặc aria-hidden phù hợp.

---

# 21. SEO CƠ BẢN

Cấu hình:

Title:

“Công cụ tính toán điện mặt trời”

Description:

“Ước tính chi phí lắp đặt, sản lượng điện, tiền tiết kiệm và thời gian hoàn vốn của hệ thống điện mặt trời.”

Thêm Open Graph metadata cơ bản.

---

# 22. ANALYTICS EVENTS

Tạo abstraction để sau này kết nối analytics.

Các event:

```ts
calculator_started
calculation_completed
package_selected
survey_form_opened
survey_submitted
zalo_clicked
```

Trong MVP có thể log vào console ở development, nhưng code phải được tách thành module để thay bằng Google Analytics sau này.

---

# 23. KIỂM THỬ BẮT BUỘC

Viết unit test cho module tính toán.

## Test 1: Không có pin

Input:

```ts
{
  monthlyBill: 2000000,
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false
}
```

Với gói 3 kWp:

Kỳ vọng gần đúng:

```ts
estimatedMonthlyConsumptionKwh ≈ 714.29
daytimeDemandKwh ≈ 535.71
adjustedGenerationKwh = 360
directSolarUseKwh = 360
batteryUseKwh = 0
totalSolarUseKwh = 360
monthlySavingsVnd = 1008000
billAfterSolarVnd = 992000
reductionPercent ≈ 50.4
paybackMonths ≈ 29.76
paybackYears ≈ 2.48
```

Dùng tolerance phù hợp cho số thực.

---

## Test 2: Không được tiết kiệm vượt hóa đơn

Đảm bảo:

```ts
monthlySavingsVnd <= monthlyBill
billAfterSolarVnd >= 0
```

---

## Test 3: Mái không đủ diện tích

Nếu mái 10 m²:

- Không được đề xuất gói yêu cầu 12 m² trở lên.
- Nếu không có gói phù hợp, trả `recommendedPackage = null`.

---

## Test 4: Khách cần điện dự phòng

Nếu:

```ts
backupRequired = true
```

Chỉ package có:

```ts
systemType === "hybrid"
```

được đưa vào danh sách đủ điều kiện.

---

## Test 5: Pin không tạo ra điện

Đảm bảo:

```ts
batteryUseKwh <= solarSurplusKwh
```

Pin chỉ lưu điện mặt trời dư, không tự sinh ra điện.

---

## Test 6: Không chia cho 0

Nếu tiền tiết kiệm bằng 0:

```ts
paybackMonths = null
paybackYears = null
```

---

## Test 7: Province factor

Gói có sản lượng cơ sở 360 kWh ở Hà Nội phải có:

```ts
360 * 0.88 = 316.8 kWh
```

---

## Test 8: Recommendation

Với input mẫu:

```ts
{
  monthlyBill: 2000000,
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false
}
```

Gói 3 kWp phải có điểm phù hợp cao hơn gói 2 kWp theo công thức đã định nghĩa.

Không hard-code kết quả đề xuất. Kết quả phải đến từ score.

---

# 24. KIỂM THỬ GIAO DIỆN

Ít nhất phải kiểm tra:

1. Nhập đầy đủ và tính toán thành công.
2. Bỏ trống tiền điện.
3. Nhập tiền điện âm.
4. Nhập diện tích mái dưới 5 m².
5. Chọn cần dự phòng nhưng mái không đủ.
6. Mở trên màn hình điện thoại.
7. Chọn gói khác trong bảng so sánh.
8. Gửi form khảo sát.
9. Reload trang không gây lỗi.
10. Không có package trong database.

---

# 25. README

Tạo README đầy đủ gồm:

- Mục tiêu dự án.
- Công nghệ sử dụng.
- Cách cài đặt.
- Cách cấu hình `.env`.
- Cách tạo database.
- Cách chạy migration.
- Cách seed dữ liệu.
- Cách chạy development.
- Cách build production.
- Cách chạy test.
- Công thức tính toán.
- Logic đề xuất gói.
- Các giả định MVP.
- Các phần chưa triển khai.
- Cách cập nhật gói sản phẩm.
- Cách cập nhật hệ số tỉnh.
- Cách cập nhật giá điện.

Tạo file:

```text
.env.example
```

Không commit mật khẩu thật hoặc secret thật.

---

# 26. CÁC BƯỚC TRIỂN KHAI BẮT BUỘC

Thực hiện đúng thứ tự này.

## Giai đoạn 0: Kiểm tra repository

- Liệt kê cấu trúc dự án.
- Đọc package manager.
- Đọc framework hiện tại.
- Đọc các script hiện có.
- Kiểm tra database hiện có.
- Tóm tắt kế hoạch triển khai.

Chưa sửa code ở bước này.

---

## Giai đoạn 1: Khởi tạo nền tảng

- Thiết lập TypeScript.
- Thiết lập Tailwind.
- Thiết lập database.
- Thiết lập Prisma.
- Tạo schema.
- Tạo migration.
- Tạo seed.
- Chạy seed thành công.

Điều kiện hoàn thành:

- App chạy được.
- Database tạo được.
- Có bốn package mẫu.

---

## Giai đoạn 2: Types và validation

- Tạo toàn bộ type.
- Tạo enum.
- Tạo Zod schema.
- Tạo formatter tiền, kWh, phần trăm và thời gian.

Điều kiện hoàn thành:

- Type-check không lỗi.
- Validation có unit test.

---

## Giai đoạn 3: Bộ máy tính toán

- Tạo `solar-calculator.ts`.
- Viết toàn bộ công thức.
- Tạo kết quả thấp, tiêu chuẩn và cao.
- Không phụ thuộc giao diện.

Điều kiện hoàn thành:

- Tất cả unit test tính toán chạy thành công.

---

## Giai đoạn 4: Bộ máy đề xuất

- Lọc package.
- Tính score.
- Sắp xếp package.
- Trả gói đề xuất.
- Trả tối đa ba gói so sánh.

Điều kiện hoàn thành:

- Test recommendation chạy thành công.
- Không có hard-code tên gói trong logic.

---

## Giai đoạn 5: API hoặc server actions

- Tạo calculation.
- Lưu calculation.
- Tạo lead.
- Lấy packages.
- Cập nhật package.
- Lấy và cập nhật settings.

Điều kiện hoàn thành:

- Server validate dữ liệu.
- API có xử lý lỗi rõ ràng.

---

## Giai đoạn 6: Giao diện form

- Xây dựng năm input.
- Validation phía client.
- Loading state.
- Error state.
- Responsive.

Điều kiện hoàn thành:

- Có thể nhập dữ liệu và gọi calculation.

---

## Giai đoạn 7: Giao diện kết quả

- Gói đề xuất.
- KPI tiết kiệm.
- Biểu đồ hoàn vốn.
- So sánh gói.
- Thiết bị.
- Nhận xét.
- Cảnh báo.

Điều kiện hoàn thành:

- Kết quả đúng với unit test.
- Giao diện mobile không tràn.

---

## Giai đoạn 8: Lead form

- Form đăng ký khảo sát.
- Lưu database.
- Success state.
- Failure state.
- Nút Zalo.

Điều kiện hoàn thành:

- Lead liên kết đúng calculation.

---

## Giai đoạn 9: Trang quản trị

- Đăng nhập.
- Quản lý packages.
- Quản lý settings.
- Quản lý leads.

Điều kiện hoàn thành:

- Sửa package trên admin làm thay đổi kết quả công cụ.
- Không cần sửa source code.

---

## Giai đoạn 10: Hoàn thiện

- SEO.
- Accessibility.
- Analytics abstraction.
- README.
- `.env.example`.
- Empty states.
- Error handling.
- Responsive testing.

---

# 27. CÁCH BÁO CÁO TIẾN ĐỘ

Sau mỗi giai đoạn, báo cáo đúng cấu trúc:

```text
Giai đoạn đã hoàn thành:
- ...

Các file đã tạo hoặc chỉnh sửa:
- ...

Kiểm tra đã chạy:
- lint:
- type-check:
- unit test:
- build:

Kết quả:
- ...

Vấn đề còn lại:
- ...

Bước tiếp theo:
- ...
```

Không chỉ nói “đã hoàn thành”. Phải liệt kê file và kết quả kiểm tra thực tế.

---

# 28. ĐIỀU KIỆN HOÀN THÀNH TOÀN BỘ

Dự án chỉ được xem là hoàn thành khi:

1. Khách nhập được năm input.
2. Form có validation.
3. Hệ thống tính đúng công thức.
4. Hệ thống lọc đúng theo diện tích mái.
5. Hệ thống lọc đúng nhu cầu dự phòng.
6. Hệ thống đề xuất gói bằng score.
7. Hiển thị tối đa ba gói.
8. Hiển thị tiền tiết kiệm.
9. Hiển thị hóa đơn còn lại.
10. Hiển thị tỷ lệ giảm hóa đơn.
11. Hiển thị hoàn vốn.
12. Hiển thị biểu đồ dòng tiền.
13. Hiển thị thiết bị và bảo hành.
14. Khách gửi được form khảo sát.
15. Lead được lưu vào database.
16. Admin sửa được gói.
17. Admin sửa được settings.
18. Admin xem được leads.
19. Có dữ liệu seed.
20. Có unit test.
21. Lint không lỗi.
22. Type-check không lỗi.
23. Test không lỗi.
24. Build production thành công.
25. Có README.
26. Có `.env.example`.
27. Không có secret trong source code.
28. Giao diện hoạt động tốt trên mobile và desktop.

---

# 29. KẾT QUẢ CUỐI CÙNG CẦN TRẢ

Khi hoàn thành, trả về:

1. Tóm tắt kiến trúc.
2. Danh sách toàn bộ file chính.
3. Hướng dẫn chạy dự án.
4. Hướng dẫn chạy migration và seed.
5. Tài khoản admin mẫu.
6. Danh sách biến môi trường.
7. Kết quả lint.
8. Kết quả type-check.
9. Kết quả unit test.
10. Kết quả production build.
11. Những giới hạn còn lại của MVP.
12. Đề xuất ba bước nâng cấp tiếp theo.

Bắt đầu từ Giai đoạn 0. Không bỏ qua bước kiểm tra repository.

---

# GỢI Ý CÁCH CHẠY PROMPT

Trong lần chạy đầu, chỉ hoàn thành từ **Giai đoạn 0 đến Giai đoạn 4**.

Sau khi xác nhận:

- Công thức đúng.
- Unit test chạy thành công.
- Logic đề xuất đúng.
- Database seed đúng.

Mới tiếp tục từ **Giai đoạn 5 đến Giai đoạn 10** để tránh phải sửa lại toàn bộ ứng dụng.

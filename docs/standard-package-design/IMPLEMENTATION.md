# Kế hoạch đưa 7 gói chuẩn vào dự án

## Mục tiêu giao hàng

Giữ bảy gói dễ hiểu cho khách, nhưng dữ liệu phía sau phải là hồ sơ kỹ thuật
có thể kiểm tra và duyệt. Website chỉ giới thiệu phương án tham khảo; mọi cấu
hình, sản lượng, thiết bị, phạm vi và giá chính thức được xác nhận sau khảo sát.

## Nguyên tắc triển khai

- Không thay các model hoặc thông số còn thiếu bằng dữ liệu suy đoán.
- Không phát hành gói có model không khớp datasheet, không qua kiểm tra string
  hoặc không có BOM/thuế được duyệt.
- Phân biệt rõ: `dự thảo nội bộ`, `đủ hồ sơ kỹ thuật`, và `đã duyệt phát hành`.
- Giá khách thấy là giá tham khảo từ; biến động do mái, tủ điện, tuyến cáp,
  khung, vận chuyển và VAT phải được nêu rõ.

## Tóm tắt các pha

| Pha | Kết quả độc lập | Điều kiện hoàn thành |
| --- | --- | --- |
| 1 | Sổ nguồn dữ liệu và trạng thái duyệt | Không còn model/mã nguồn mơ hồ. |
| 2 | Mô hình hồ sơ kỹ thuật và validator | Tự chặn cấu hình điện không hợp lệ. |
| 3 | Thiết kế lại/duyệt bảy cấu hình | Mỗi gói có string, MPPT, backup và mái đạt. |
| 4 | BOM, giá và sản lượng theo nguồn | Không còn tổng giá/VAT/sản lượng suy đoán. |
| 5 | Tích hợp catalog, giao diện và kiểm thử | Khách thấy thông tin rõ; nội bộ kiểm soát phát hành. |

---

## Pha 1: Chuẩn hóa nguồn và quyền duyệt

### Công việc

- Lập bảng chứng cứ cho panel, inverter, pin, bảo hành, giá và BOM: model/SKU,
  URL hoặc tệp nguồn, phiên bản, ngày hiệu lực, nhà cung cấp và người duyệt.
- Đưa toàn bộ bảy gói về `technicalStatus: draft`. Model sai `ASW8000-S-G2`
  đã được thay bằng `ASW8000-S` theo datasheet Solplanet 6–10 kW; gói chỉ được
  duyệt sau khi có datasheet panel, layout/string và khảo sát công trình.
- Thu thập datasheet chính thức cho Risen 720/730 W, Solplanet 5/6 kW, SRNE
  hybrid 1 pha/3 pha, Yunqida 16 kWh và bảng tương thích pin–inverter.
- Chốt chính sách tỷ lệ DC/AC: mặc định 1,10–1,30; mọi ngoại lệ cần lý do và
  người duyệt.

### Thành công

- Mỗi model được dùng có ít nhất một nguồn có phiên bản và hiệu lực rõ ràng.
- Không có gói nào gắn `approved` bằng dữ liệu báo giá mẫu hoặc dữ liệu nội suy.

### Tệp dự kiến

- `src/types/standard-package.ts`
- `src/config/standard-package-catalog.ts`
- `docs/standard-package-design/EVIDENCE-REGISTER.md`

---

## Pha 2: Mở rộng hồ sơ kỹ thuật và cổng kiểm tra

### Công việc

- Bổ sung trường điện DC/AC, pin, string/MPPT, backup, layout mái và trạng thái
  duyệt vào `StandardPackageDefinition`.
- Viết validator cho: công suất DC, tỷ lệ DC/AC, giới hạn PV inverter, Voc lạnh,
  Vmp nóng, dòng MPPT, số string, pha điện, dòng AC, công suất/tải backup,
  diện tích mái và dữ liệu nguồn bắt buộc.
- Thiết lập lỗi chặn seed đối với gói `approved`; gói `draft` có thể seed nhưng
  phải giữ cảnh báo nội bộ, không trở thành kết quả đề xuất chính.

### Thành công

- Một thay đổi sai model, sai string hay vượt dòng MPPT làm test/seed thất bại.
- Validator trả lỗi dễ hiểu cho kỹ thuật và không đưa chi tiết nội bộ ra giao diện khách.

### Tệp dự kiến

- `src/types/standard-package.ts`
- `src/lib/standard-package-validation.ts`
- `tests/standard-package-validation.test.ts`
- `prisma/seed.ts`

---

## Pha 3: Thiết kế và duyệt từng gói

### Công việc

- Giữ bảy nhu cầu khách hàng, nhưng dùng cấu hình cuối chỉ khi vượt qua Pha 2.
- Thiết kế array theo số tấm nguyên và số string thực tế; mỗi thiết kế lưu nhiệt
  độ giả định, kết quả Voc/Vmp/dòng và phân MPPT.
- Thiết kế backup theo tải ưu tiên; tính thời gian từ năng lượng dùng được và
  hiệu suất, bao gồm điều kiện không backup toàn bộ nhà.
- Kiểm tra layout mái, khoảng hở, bóng che, kết cấu, chống thấm, tải gió và
  tuyến cáp cho từng loại mái áp dụng.
- Quyết định dứt khoát cho gói 8 kW 1 pha: thay inverter có chứng cứ phù hợp,
  đổi sang ba pha, hoặc thay bằng một gói khác. Không giữ model hiện tại chỉ để
  đủ số gói.

### Thành công

- Mỗi gói có một `stringPlan`, `backupPlan`, `roofPlan` và người duyệt kỹ thuật.
- Các gói đang có tỷ lệ DC/AC 0,973–1,095 được thiết kế lại hoặc có ngoại lệ ký duyệt.

### Tệp dự kiến

- `src/config/standard-package-catalog.ts`
- `src/config/customer-reference-packages.ts`
- `tests/customer-reference-packages.test.ts`

---

## Pha 4: BOM, giá tham khảo và sản lượng

### Công việc

- Tạo BOM theo cấu hình/loại mái thay vì nhân đơn giá/kWp cố định: khung, kẹp,
  cáp, CB/SPD, tiếp địa, tủ điện, ATS/EPS, nhân công và vận chuyển.
- Tách giá thiết bị, thi công chuẩn, phần phát sinh khảo sát, VAT và thời hạn giá.
- Giữ cảnh báo báo giá mẫu cho tới khi người chịu trách nhiệm xác nhận VAT và
  tổng tiền bằng chữ/số.
- Thay `baseMonthlyGenerationKwh` đồng loạt bằng mô hình theo tỉnh/tháng dựa
  trên PVout và tổn hao; giao diện chỉ hiển thị khoảng ước tính.

### Thành công

- BOM đầy đủ phải cộng đúng tổng giá; BOM không đủ không được dùng để phát hành
  báo giá chính thức.
- Sản lượng khác nhau hợp lý theo tỉnh và không còn dùng một hệ số 120 cố định
  cho mọi nơi.

### Tệp dự kiến

- `src/config/standard-package-catalog.ts`
- `src/config/customer-reference-packages.ts`
- `src/config/defaults.ts`
- `src/lib/*calculation*.ts`
- `tests/*package*.test.ts`

---

## Pha 5: Tích hợp catalog và nghiệm thu

### Công việc

- Chỉ lấy gói `approved` làm đề xuất tự động; gói `draft` chỉ có thể hiển thị
  khi được quản trị bật và luôn có thông báo xác nhận sau khảo sát.
- Bổ sung phần "Điều kiện áp dụng" cho từng gói: pha điện, diện tích mái, tải
  ban ngày/backup, phần bao gồm và loại trừ.
- Bổ sung luồng admin để xem nguồn datasheet, trạng thái duyệt, BOM và cảnh báo
  trước khi cập nhật catalog.
- Viết các ca nghiệm thu xấu: sai model, panel vượt điện áp, số string không
  khớp, pin không đủ công suất, mái không đủ, VAT mơ hồ, BOM lệch và giá hết hạn.

### Thành công

- Khách hiểu nhanh bảy phương án nhưng không bị hiểu là báo giá chính thức.
- Kỹ thuật có đủ bằng chứng để chấp nhận hoặc từ chối từng gói.
- `type-check`, lint, test và build đều đạt; seed chỉ phát hành catalog hợp lệ.

### Tệp dự kiến

- `src/components/calculator/PackageComparison.tsx`
- `src/components/calculator/SolarCalculator.tsx`
- `src/server/repositories.ts`
- `prisma/seed.ts`
- `tests/customer-reference-packages.test.ts`

## Quy tắc kiểm thử trước mỗi lần phát hành

1. Kiểm thử số học: công suất DC, DC/AC, diện tích phủ tấm, diện tích mái.
2. Kiểm thử datasheet: điện áp, dòng, MPPT, giới hạn PV, AC và bảo hành.
3. Kiểm thử hybrid: tải ưu tiên, công suất xả, thời gian backup và phân pha.
4. Kiểm thử thương mại: BOM, VAT, ngày hiệu lực, phạm vi và ngoại lệ.
5. Kiểm thử giao diện: giá tham khảo, điều kiện áp dụng và cảnh báo khảo sát.

## Quyết định cần được xác nhận ở Pha 1

1. Giữ, đổi pha hay thay thế gói hòa lưới 8 kW hiện tại sau khi có datasheet
   inverter tương ứng.
2. Dải tấm pin/model được phép dùng cho bảy gói và nhà cung cấp chính thức.
3. Các tải được phép đưa vào backup mặc định của pin 16 kWh.
4. Chính sách giá hiển thị khi BOM/VAT chưa đủ: ẩn giá hoặc chỉ ghi "liên hệ
   khảo sát".

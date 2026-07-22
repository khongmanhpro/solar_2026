# Roadmap triển khai Solar Calculator MVP

## Cách tiếp cận

Xây dựng theo hai mốc kiểm soát. Mốc A hoàn thiện nền tảng dữ liệu, công thức và bộ máy đề xuất trước; chỉ chuyển sang Mốc B sau khi seed, công thức và test đã được xác nhận. Business logic, dữ liệu mặc định và giao diện được tách riêng để trang quản trị có thể thay đổi kết quả mà không cần sửa source code.

## Phạm vi

### Trong MVP

- Công cụ tính toán bằng tiếng Việt với 5 đầu vào chính.
- Tính sản lượng, mức tự dùng, hóa đơn còn lại, tiết kiệm và hoàn vốn.
- Lọc, chấm điểm và so sánh tối đa 3 gói điện mặt trời.
- Lưu lịch sử calculation và lead đăng ký khảo sát.
- Trang quản trị packages, settings, province factors và leads.
- Đăng nhập quản trị đơn giản bằng thông tin từ biến môi trường.
- Responsive, accessibility, SEO cơ bản và analytics abstraction.
- Unit test, integration test cần thiết, lint, type-check và production build.

### Ngoài MVP

- OCR hóa đơn, AI phân tích mái, ảnh vệ tinh và mô phỏng bóng râm 3D.
- Biểu giá điện bậc thang hoặc dữ liệu bức xạ thời gian thực.
- Thanh toán, CRM đầy đủ, API Zalo thật hoặc tích hợp inverter.
- Ứng dụng mobile native.

## Nguyên tắc kỹ thuật

- Dùng Next.js App Router, TypeScript strict, Tailwind CSS, Prisma, SQLite, Zod, Recharts và Vitest vì repository chưa có framework.
- Không đặt công thức hoặc logic đề xuất trong React component hay route handler.
- Không hard-code packages hoặc settings trong component.
- Validate lại mọi dữ liệu ở server bằng Zod.
- Không làm tròn trong quá trình tính; chỉ định dạng ở lớp hiển thị.
- Không xóa cứng package đã được tham chiếu; chỉ chuyển `active` thành `false`.
- Sau mỗi giai đoạn, chạy các kiểm tra đang áp dụng và không chuyển bước khi còn lỗi.

## Mốc A — Nền tảng và bộ máy nghiệp vụ

### Giai đoạn 0 — Khảo sát repository (đã hoàn thành)

- [x] Đọc toàn bộ tài liệu yêu cầu.
- [x] Kiểm tra cấu trúc repository, package manager, framework và database hiện có.
- [x] Xác nhận repository chưa có ứng dụng; chỉ có tài liệu đặc tả.
- [x] Chọn stack mặc định theo đặc tả.

**Điều kiện hoàn thành:** Có roadmap được duyệt; chưa sửa mã ứng dụng.

### Giai đoạn 1 — Khởi tạo nền tảng và database (đã hoàn thành)

- [x] Khởi tạo Next.js App Router với TypeScript strict và Tailwind CSS.
- [x] Thiết lập scripts cho `dev`, `lint`, `type-check`, `test`, `test:run`, `build`, Prisma migration và seed.
- [x] Cài đặt Prisma, SQLite, Zod, Recharts và Vitest.
- [x] Tạo `.env.example`, cấu hình database local và module Prisma client.
- [x] Tạo schema cho `SolarPackage`, `CalculationSetting`, `ProvinceFactor`, `Calculation` và `Lead` cùng enum cần thiết.
- [x] Tạo migration ban đầu và seed 4 packages, 8 province factors cùng settings mặc định.
- [x] Xác minh database có đúng dữ liệu seed và ứng dụng khởi động được.

**Điều kiện hoàn thành:** App chạy; migration và seed thành công; database có đúng 4 packages.

### Giai đoạn 2 — Types, validation và định dạng (đã hoàn thành)

- [x] Tạo `src/types/solar.ts` cho input, settings, package, kết quả chuẩn, khoảng ước tính và kết quả recommendation.
- [x] Tạo `src/config/defaults.ts` làm nguồn seed/fallback duy nhất cho dữ liệu mặc định.
- [x] Tạo Zod schemas cho calculation, lead, package, settings, province factor và cập nhật lead status.
- [x] Tạo formatters cho VND, kWh, phần trăm và thời gian hoàn vốn.
- [x] Thêm domain `electricityType` và biểu giá điện sinh hoạt 5 bậc chưa VAT.
- [x] Viết unit test cho giới hạn input, số điện thoại Việt Nam và formatter quan trọng.

**Điều kiện hoàn thành:** Validation test đạt; type-check, lint và test không lỗi.

### Giai đoạn 3 — Bộ máy tính toán (đã hoàn thành)

- [x] Tạo `src/lib/solar-calculator.ts` thuần TypeScript, không phụ thuộc React, Prisma hoặc HTTP.
- [x] Triển khai đúng thứ tự 14 bước tính toán trong đặc tả.
- [x] Chặn tiết kiệm vượt hóa đơn, điện pin vượt solar surplus, giá trị âm và chia cho 0.
- [x] Tính lại đầy đủ ba kịch bản thấp, chuẩn và cao từ sản lượng tương ứng.
- [x] Tạo dữ liệu dòng tiền từ năm 0 đến năm 20 và xác định năm hòa vốn đầu tiên.
- [x] Tạo hàm nhận xét tự động riêng, tránh các cụm từ bị cấm.
- [x] Suy ngược hóa đơn ra kWh và tính lại hóa đơn sau điện mặt trời theo giá lũy tiến.
- [x] Viết test cho các ca bắt buộc 1, 2, 5, 6 và 7 cùng các biên số học.

**Điều kiện hoàn thành:** Kết quả mẫu gói 3 kWp đạt tolerance; toàn bộ test calculation đạt.

### Giai đoạn 4 — Bộ máy lọc và đề xuất (đã hoàn thành)

- [x] Tạo `src/lib/solar-recommendation.ts` độc lập với giao diện và database.
- [x] Lọc package theo `active`, diện tích mái và nhu cầu dự phòng.
- [x] Tính `targetGenerationKwh`, ba score thành phần và score cuối theo đặc tả.
- [x] Ưu tiên grid-tied khi không cần dự phòng mà không hard-code code hoặc tên gói.
- [x] Sắp xếp theo score, trả gói đề xuất và tối đa 3 gói so sánh.
- [x] Trả `recommendedPackage: null` khi không có package hợp lệ.
- [x] Viết test cho mái không đủ, backup-only hybrid và gói 3 kWp thắng gói 2 kWp với input mẫu.

**Điều kiện hoàn thành:** Seed, calculation và recommendation test đạt; lint, type-check và build thành công.

### Cổng xác nhận Mốc A (sẵn sàng xác nhận)

Tạm dừng sau Giai đoạn 4 và báo cáo:

- Schema, migration và dữ liệu seed thực tế.
- Kết quả mẫu của ba kịch bản thấp/chuẩn/cao.
- Bảng score của các packages với input test chuẩn.
- Kết quả lint, type-check, unit test và build.
- Các giả định hoặc sai khác cần người dùng xác nhận trước khi làm giao diện.

## Mốc B — API, trải nghiệm khách hàng và quản trị

### Giai đoạn 5 — API và lớp dịch vụ (đã hoàn thành)

- [x] Tạo repository/service cho packages, settings, province factors, calculations và leads.
- [x] Tạo endpoint hoặc server action tính toán, lưu calculation và trả cả `calculationId`.
- [x] Tạo chức năng tạo lead và bắt buộc liên kết với calculation hợp lệ.
- [x] Tạo CRUD có kiểm soát cho package, settings, province factors và lead status.
- [x] Chuẩn hóa response lỗi và validate toàn bộ input tại server.
- [x] Viết integration test cho calculation, lead và các thao tác admin trọng yếu.

**Điều kiện hoàn thành:** API trả lỗi rõ ràng, không nhận dữ liệu sai và lưu đúng quan hệ database.

### Giai đoạn 6 — Form tính toán (đã hoàn thành)

- [x] Xây dựng 6 input, gồm loại điện, với label, mô tả, đơn vị và thông báo lỗi tiếng Việt.
- [x] Triển khai client validation, loading, server error và trạng thái chưa nhập.
- [x] Gửi calculation và giữ `calculationId` phục vụ lead form.
- [x] Tạo layout desktop hai cột và mobile một cột không tràn ngang.
- [x] Gắn analytics events `calculator_started` và `calculation_completed` qua abstraction riêng.

**Điều kiện hoàn thành:** Người dùng nhập, sửa lỗi và nhận kết quả calculation thành công trên desktop/mobile.

### Giai đoạn 7 — Giao diện kết quả (đã hoàn thành)

- [x] Hiển thị gói đề xuất, 6 KPI, khoảng sản lượng và khoảng hoàn vốn.
- [x] Hiển thị tiết kiệm 5/10/20 năm cùng ghi chú giả định.
- [x] Xây dựng biểu đồ dòng tiền 0–20 năm với tooltip VND và mốc hòa vốn.
- [x] Xây dựng so sánh tối đa 3 package và hỗ trợ chọn package khác.
- [x] Hiển thị thiết bị, bảo hành, nhận xét tự động và cảnh báo bắt buộc.
- [x] Triển khai trạng thái không có package và không có dữ liệu biểu đồ.

**Điều kiện hoàn thành:** UI phản ánh đúng kết quả unit test; mobile không tràn; package được chọn hiển thị nhất quán.

### Giai đoạn 8 — Lead form và kênh liên hệ (đã hoàn thành)

- [x] Hiển thị lead form sau kết quả mà không chặn kết quả bằng số điện thoại.
- [x] Validate họ tên, số điện thoại, thời gian liên hệ và các field tùy chọn.
- [x] Lưu lead cùng calculation, input, package và snapshot kết quả.
- [x] Triển khai submitting, success và failure states.
- [x] Thêm nút Zalo/hotline từ settings và analytics events tương ứng.

**Điều kiện hoàn thành:** Lead được lưu đúng calculation; reload không làm hỏng trang; lỗi gửi không tạo màn hình trắng.

### Giai đoạn 9 — Trang quản trị

- [x] Tạo đăng nhập admin bằng credentials từ biến môi trường và session cookie an toàn.
- [x] Bảo vệ `/admin`, `/admin/packages`, `/admin/settings` và `/admin/leads` ở server.
- [x] Tạo dashboard tóm tắt packages và leads.
- [x] Tạo quản lý package: xem, thêm, sửa, sắp xếp và bật/tắt.
- [x] Tạo quản lý settings và province factors với validation.
- [x] Tạo danh sách leads, chi tiết calculation và cập nhật trạng thái.
- [x] Xác minh thay đổi package/settings ảnh hưởng lần tính toán tiếp theo mà không sửa source.

**Điều kiện hoàn thành:** Toàn bộ route được bảo vệ; admin thao tác thành công; không có hard-delete package.

### Giai đoạn 10 — Hoàn thiện và nghiệm thu

- [ ] Thêm metadata SEO và Open Graph.
- [ ] Hoàn thiện keyboard navigation, focus, ARIA, liên kết lỗi-input và contrast.
- [ ] Hoàn thiện analytics abstraction cho đủ 6 events.
- [ ] Kiểm tra toàn bộ empty, loading, success và error states.
- [ ] Thực hiện checklist UI trên desktop và viewport mobile.
- [ ] Viết README về cài đặt, env, migration, seed, công thức, recommendation, vận hành admin và giới hạn MVP.
- [ ] Kiểm tra repository không chứa secret hoặc dữ liệu local không nên commit.
- [ ] Chạy nghiệm thu cuối: lint, type-check, toàn bộ test và production build.

**Điều kiện hoàn thành:** Đạt đủ 28 điều kiện hoàn thành trong đặc tả và có báo cáo kiểm tra thực tế.

## Ma trận kiểm thử tối thiểu

| Lớp | Nội dung bắt buộc |
| --- | --- |
| Validation | Loại điện sai, tiền điện trống/âm/ngoài giới hạn, mái dưới 5 m², province/enum sai, điện thoại sai |
| Calculator | Biên 5 bậc giá điện, đảo hóa đơn-kWh, ca mẫu 3 kWp, giới hạn hóa đơn, pin không sinh điện, tiết kiệm 0, province factor, low/high |
| Recommendation | Mái không đủ, backup chỉ hybrid, active=false, tối đa 3 gói, score 3 kWp > 2 kWp |
| API/service | Lưu calculation, tạo lead liên kết calculation, server validation, lỗi not-found/conflict |
| Admin | Route protection, package update/disable, settings update, lead status update |
| UI | Luồng tính thành công, mọi error/loading/empty state, chọn gói, gửi lead, reload, mobile |

## Kiểm tra sau mỗi giai đoạn

Các lệnh chính xác sẽ được chốt sau khi khởi tạo `package.json`, nhưng phải có các nhóm sau:

```bash
npm run lint
npm run type-check
npm run test:run
npm run build
```

Migration và seed phải được kiểm tra riêng trong Giai đoạn 1 và khi schema thay đổi.

## Mẫu báo cáo tiến độ

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

## Các quyết định cần ghi lại trong README

- `PackageCalculationResult` sẽ có thêm kết quả thấp/cao và dữ liệu dòng tiền vì type mẫu chưa bao quát các output bắt buộc.
- API calculation sẽ trả thêm `calculationId` để lead có thể liên kết đúng calculation.
- Tỷ lệ dùng điện ban ngày và thông tin doanh nghiệp sẽ được lưu trong settings dù interface mẫu chưa liệt kê đầy đủ.
- `maintenanceRatePerYear` mặc định bằng 0; khi khác 0 chỉ được đưa vào công thức sau khi xác định rõ cách áp dụng.
- Admin credentials chỉ đến từ environment; `.env.example` chỉ chứa giá trị minh họa.

## Câu hỏi mở không chặn triển khai

- Thương hiệu, model thiết bị, hotline, Zalo và tên doanh nghiệp hiện dùng dữ liệu mẫu rồi chỉnh trong admin.
- SQLite là database local/MVP; lựa chọn database production sẽ được quyết định khi có yêu cầu triển khai thật.

# Roadmap triển khai dữ liệu thật và phát hành có kiểm soát

## 1. Mục tiêu và cách dùng tài liệu

Tài liệu này là kế hoạch thực thi để thay toàn bộ dữ liệu `DEMO`/`DRAFT` của
Solar Calculator bằng dữ liệu có thể dùng cho khách hàng. Nó bổ sung, không thay
thế, [ROADMAP.md](../ROADMAP.md),
[DATA-ONBOARDING.md](./DATA-ONBOARDING.md) và
[ACCURACY-ACCEPTANCE.md](./ACCURACY-ACCEPTANCE.md).

**Mục tiêu phát hành đầu tiên (R1):** khách hàng hộ gia đình có thể nhập kWh,
nhận kết quả tư vấn sơ bộ có nguồn và phạm vi áp dụng rõ ràng; mọi dữ liệu dùng
cho kết quả phải truy vết và được duyệt. Nhập tổng tiền chỉ được bật sau khi
đối soát hóa đơn thật đạt nghiệm thu. OCR không thuộc R1.

**Nguyên tắc:** không đổi nhãn `DRAFT` thành `VERIFIED` chỉ vì script đã chạy,
nguồn dữ liệu có vẻ hợp lý, hoặc test kỹ thuật đang xanh.

## 2. Baseline đã kiểm tra

Tại thời điểm lập roadmap, database local có:

| Dataset | Trạng thái | Nhận định |
| --- | --- | --- |
| Catalog gói | 4 bản ghi `DEMO` | Giá, thiết bị, bảo hành và phạm vi thi công chỉ là mẫu. |
| Hệ số tỉnh | 1 `DEMO`, 63 `DRAFT`, 0 `VERIFIED` | 63 bản ghi được tạo từ script NASA POWER nhưng chưa có phương pháp/duyệt kỹ sư. |
| Giả định tính toán | 1 `DEMO` | Tỷ lệ dùng ban ngày, pin, khoảng kết quả và tài chính chưa được nghiệm thu. |
| Biểu giá/VAT | `DRAFT` | Có nguồn pháp lý trong registry nhưng thiếu duyệt nội bộ và đối soát hóa đơn thật. |
| Calculation/lead | 3 calculation `DEMO`, 0 lead | Không phải dữ liệu nghiệm thu hoặc bằng chứng thương mại. |

Do đó `NODE_ENV=production` phải tiếp tục chặn calculation mới. Đây là điều
kiện an toàn cần giữ nguyên cho tới Giai đoạn 7.

## 3. Điều kiện dữ liệu được gọi là “thật”

Một dataset chỉ được dùng ở production khi đồng thời có:

1. **Nội dung xác định:** giá trị, đơn vị, phạm vi địa lý/thời gian và phương
   pháp tính rõ ràng.
2. **Nguồn lưu được:** URL/tài liệu gốc, ngày lấy, quyền sử dụng nếu cần và
   hash SHA-256 của nội dung đã duyệt.
3. **Chủ sở hữu:** người hoặc nhóm chịu trách nhiệm cập nhật khi dữ liệu đổi.
4. **Hiệu lực:** `effectiveFrom`, `effectiveTo` (hoặc ghi rõ không có ngày hết
   hạn) và version bất biến.
5. **Phê duyệt độc lập:** `approvedBy`, `approvedAt`; người duyệt không tự duyệt
   dữ liệu mình đã tính/nhập khi có thể tách vai trò.
6. **Nghiệm thu:** ca test độc lập, kết quả kỳ vọng và sai số chấp nhận đã ký.
7. **Triển khai có review:** import/migration/configuration versioned, kiểm tra
   hash sau deploy và khả năng rollback.

`VERIFIED` thiếu bất kỳ mục nào ở trên phải được xử lý như `DRAFT`.

## 4. Phạm vi theo tính năng

| Tính năng | Có code hiện tại | Dữ liệu thật cần có | Mốc bật production |
| --- | --- | --- | --- |
| Nhập kWh 1–12 tháng | Có | Gói, sản lượng, giả định, biểu giá dự phóng đã duyệt | R1 |
| Nhập tổng tiền và suy ngược kWh | Có nhưng khóa ở production | Biểu giá, VAT, làm tròn và hóa đơn thật đã đối soát | R1.1 |
| Chọn tỉnh | Có | Dataset sản lượng đã duyệt theo tỉnh/phạm vi hỗ trợ | R1 |
| Lọc/xếp hạng gói | Có | Catalog, quy tắc tương thích và trọng số được duyệt | R1 |
| Pin và điện dự phòng | Có mô hình đơn giản | Thông số pin/inverter, giới hạn vận hành và ca kỹ sư | R1.2 hoặc tắt khỏi đề xuất R1 |
| Tiết kiệm, hoàn vốn, cash flow | Có mô hình đơn giản | Giá, VAT, O&M, suy giảm, thay thế thiết bị và giả định tài chính | R1 chỉ hiển thị phạm vi sơ bộ; R2 cho mô hình đầy đủ |
| Lead khảo sát | Có | Thông tin doanh nghiệp, chính sách lưu lead và quy trình vận hành | Có thể bật cùng R1 |
| OCR hóa đơn | Chưa có | Bộ hóa đơn ẩn danh, chính sách upload/xóa, OCR benchmark | R3, không làm trong roadmap này |
| Admin CRUD | Có | Quy trình review/versioned import; không tự duyệt qua UI | Dùng nội bộ |

## 5. Vai trò bắt buộc trước khi nhập dữ liệu

Không bắt đầu import production nếu chưa chỉ định tối thiểu các vai trò sau.

| Vai trò | Trách nhiệm ký | Không được thay thế bằng |
| --- | --- | --- |
| Product owner | Phạm vi tư vấn, thông điệp và release gate | Test code |
| Pháp lý/giá điện | Biểu giá, VAT, ngày hiệu lực và cách diễn giải hóa đơn | Link nguồn chưa kiểm tra |
| Tài chính | Làm tròn, khoản khác, hóa đơn đối soát, giả định hoàn vốn | Giá điện bình quân mẫu |
| Kỹ sư điện mặt trời | Sản lượng, tổn hao, tương thích gói và backup | Hệ số GHI thô |
| Kinh doanh/vận hành | Giá gói, phạm vi báo giá, hotline và SLA lead | Seed demo |
| Technical owner | Schema, importer, hash, migration, rollback và giám sát | Sửa trực tiếp SQLite |

## 6. Kế hoạch thực hiện tuần tự

Mỗi bước chỉ chuyển sang bước kế tiếp khi đã đạt tiêu chí nghiệm thu của chính
bước đó. Không có mốc thời gian cố định vì thời gian phụ thuộc vào bằng chứng và
chữ ký chuyên môn.

### Giai đoạn 0 — Khóa phạm vi R1 và thiết lập kho bằng chứng

**Mục tiêu:** xác định đúng những gì R1 được phép hứa với khách hàng.

1. Chỉ định sáu vai trò ở phần 5 và người thay thế khi vắng mặt.
2. Chốt phạm vi R1: chỉ hộ gia đình, tỉnh nào được phục vụ, loại hệ thống nào
   được đề xuất, có/không đưa hybrid vào R1.
3. Tạo kho nội bộ có kiểm soát truy cập cho tài liệu nguồn, datasheet, workbook
   độc lập, biên bản phê duyệt và hash; không commit hóa đơn có PII vào Git.
4. Tạo `data-release/<version>/MANIFEST.md` trong repository cho metadata không
   nhạy cảm: dataset, source reference, owner, hiệu lực, approver, hash và link
   kho bằng chứng.
5. Chốt quy tắc version: không sửa dataset đã phát hành; thay đổi tạo version
   mới và giữ snapshot cũ có thể tái lập.

**Deliverable:** phạm vi R1 được ký, danh sách dataset bắt buộc, RACI và template
manifest/review.

**Gate G0:** không còn owner/nguồn/định nghĩa mơ hồ cho bất kỳ dataset nào.

### Giai đoạn 1 — Chuẩn hóa pipeline nhập dữ liệu có review

**Mục tiêu:** thay thao tác admin hoặc sửa SQLite bằng một đường nhập có thể kiểm
tra và rollback.

1. Chuyển Excel `Mau-thu-thap-du-lieu-dien-mat-troi.xlsx` thành input chuẩn
   versioned (CSV/JSON được sinh từ workbook đã duyệt).
2. Định nghĩa schema Zod cho từng dataset và validator cross-field: đơn vị,
   khoảng giá trị, ngày hiệu lực, model trùng, gói không đủ thiết bị, province
   code không hợp lệ và version chồng lấn.
3. Viết lệnh `npm run data:validate -- <release-dir>` chỉ đọc input và in lỗi
   theo dòng/cột; không ghi database.
4. Viết `npm run data:preview -- <release-dir>` để so sánh insert/update/disable
   với database, tính SHA-256 canonical và tạo report review.
5. Viết importer transaction: hoặc toàn bộ dataset được nhập, hoặc không thay
   đổi gì. Import mới luôn ở `DRAFT` trước khi release được ký.
6. Thêm backup database, migration check, dry-run và rollback bằng version trước;
   cấm dùng `--mark-verified` trong môi trường production.
7. Viết test cho input sai, import một phần, hash lệch, version trùng và rollback.

**Deliverable:** pipeline validate → preview → review → import → verify; log
release không chứa PII.

**Gate G1:** cùng một release input tạo cùng content hash; import lỗi không để
lại bản ghi dở dang; không có đường UI/script nào tự phê duyệt dữ liệu.

### Giai đoạn 2 — Duyệt biểu giá, VAT và nhánh nhập tổng tiền

**Mục tiêu:** hoàn tất dataset có phụ thuộc pháp lý trước khi bật tính từ tổng
tiền.

1. Thu thập văn bản nguồn biểu giá, VAT, ngày hiệu lực, ngày hết hiệu lực và
   quy tắc làm tròn; ghi URL, file hash và người kiểm tra.
2. Lấy tối thiểu ba hóa đơn EVN đã ẩn danh ở mức dùng thấp/trung bình/cao; bổ sung
   ca nhiều hộ, kỳ ghi điện thay đổi và khoản khác nếu R1 hỗ trợ chúng.
3. Tài chính/pháp lý xác nhận năm điểm: VAT áp dụng cho điện, thứ tự làm tròn,
   kWh thập phân hay nguyên, khoản nào tách khỏi điện năng, và cách áp hạn mức
   khi nhiều hộ/kỳ khác 30 ngày.
4. Tạo version tariff/VAT mới, không sửa record draft cũ. Gắn `selectable=true`
   chỉ khi có ngày hiệu lực và approval hợp lệ.
5. Chuyển các fixture candidate thành golden cases độc lập; so sánh từng bậc,
   subtotal, VAT và tổng tiền. Lưu kết quả kỳ vọng và người ký.
6. Chạy test biên, gap/overlap, đầu/cuối hiệu lực, round-trip và hóa đơn thật.
7. Cập nhật manifest với hash đã duyệt, `dataStatus=VERIFIED`, owner và approval;
   kiểm tra production gate với chính bundle release đó.

**Gate G2:** tất cả golden invoices đạt tolerance đã ký; tariff/VAT được chọn
duy nhất cho mọi kỳ hỗ trợ; tổng tiền mới được mở cho production.

### Giai đoạn 3 — Catalog gói, thiết bị và khả năng lắp

**Mục tiêu:** mọi gói đề xuất có giá, cấu hình và phạm vi báo giá thật.

1. Kinh doanh/kỹ thuật hoàn thành sheet `GOI_SAN_PHAM` và `THIET_BI`: mã gói,
   giá, VAT, công suất DC/AC, model, datasheet, bảo hành, diện tích mái, loại hệ
   thống, pin, hạng mục bao gồm/loại trừ, địa bàn và thời hạn báo giá.
2. Chuẩn hóa một currency/unit duy nhất; phân biệt rõ giá tham khảo và giá có
   hiệu lực. Nếu chưa thể cam kết giá, UI phải nói “khoảng tham khảo” hoặc không
   hiển thị con số đó.
3. Thêm các trường schema đang thiếu trước khi nhập (ví dụ: VAT của gói, công
   suất inverter, pha điện, vùng phục vụ, ngày hiệu lực giá, điều kiện pin).
4. Sửa eligibility để dùng điều kiện kỹ thuật thật thay vì chỉ mái/hybrid/pin;
   mọi lý do bị loại phải hiện được cho khách và lưu snapshot.
5. Kỹ sư kiểm tra tối thiểu 10 cấu hình nhà/gói; kinh doanh xác nhận giá và phạm
   vi triển khai cho từng gói.
6. Import catalog thành `DRAFT`, review preview, ký duyệt rồi phát hành
   `VERIFIED` với version/hash mới.

**Gate G3:** không có gói active thiếu datasheet, giá/phạm vi/hiệu lực hoặc lý do
đủ điều kiện; 10 ca kỹ sư chọn đúng package theo quyết định độc lập.

### Giai đoạn 4 — Dữ liệu sản lượng theo khu vực

**Mục tiêu:** thay hệ số tỉnh demo bằng mô hình có ý nghĩa kỹ thuật và giới hạn
được công khai.

1. Chốt tập tỉnh/thành được phục vụ ở R1; không tạo cảm giác hỗ trợ toàn quốc nếu
   chưa có dữ liệu đã duyệt.
2. Quy định phương pháp: nguồn khí tượng, toạ độ/ô lưới đại diện, giai đoạn khí
   hậu, cấu hình tham chiếu, các tổn hao và cách đổi thành kWh/kWp.
3. **Không phê duyệt trực tiếp annual GHI hoặc factor NASA POWER** làm sản lượng.
   GHI phải qua mô hình/kỹ sư xác định hiệu suất, tổn hao và giới hạn áp dụng.
4. Nâng schema từ một `ProvinceFactor` scalar sang dữ liệu versioned tối thiểu
   gồm `kWh/kWp/tháng`, tổng năm, P50/P90 hoặc khoảng, nguồn, tọa độ tham chiếu,
   tổn hao và effective period. Giữ adapter tương thích snapshot cũ.
5. Nhập dữ liệu cho các tỉnh R1, so sánh với PVsyst/PVGIS hoặc phương pháp do kỹ
   sư phê duyệt và ít nhất một công trình thực tế mỗi vùng khi có thể.
6. Bổ sung input hướng mái, góc nghiêng và bóng che ở mức đơn giản; nếu khách
   không biết, hạ confidence và mở rộng khoảng thay vì giả định im lặng.
7. Kỹ sư ký dataset, hash và ca đối chiếu; chỉ các tỉnh đạt gate mới hiện trong
   selector production.

**Gate G4:** mỗi tỉnh active có nguồn, phương pháp, khoảng kết quả và xác nhận
kỹ sư; không còn dùng factor `0.88/1.00/1.02` demo cho kết quả production.

### Giai đoạn 5 — Hiệu chỉnh phụ tải, pin và tài chính

**Mục tiêu:** biến kết quả “tiết kiệm/hoàn vốn” thành estimate có giả định kiểm
soát được.

1. Thu thập hóa đơn/biểu đồ tải đã ẩn danh và sự đồng ý sử dụng; tách tập hiệu
   chỉnh với tập đánh giá, không dùng PII trong Git hoặc analytics.
2. Thay ba tỷ lệ dùng ban ngày cố định bằng profile theo tháng/giờ hoặc profile
   đại diện đã duyệt; ghi rõ confidence khi chỉ có một hóa đơn.
3. Với pin: lưu dung lượng usable, DoD, SOC tối thiểu, công suất nạp/xả, hiệu
   suất, mục tiêu backup, suy giảm và lịch thay thế; mô phỏng SOC thay vì một
   chu kỳ đầy mỗi ngày.
4. Với tài chính: xác nhận O&M, vệ sinh, suy giảm panel, thay inverter/pin, VAT,
   tăng giá điện và discount rate nếu hiển thị NPV. Nếu chưa có nguồn, không hiển
   thị NPV hoặc thu hồi vốn chi tiết như một cam kết.
5. Tạo workbook độc lập để tính năng lượng, tiết kiệm, payback và xếp hạng cho
   tối thiểu 10 ca nghiệm thu; kỹ sư/tài chính ký từng lớp kết quả.
6. Chuyển từng dataset sang `VERIFIED` riêng; không để một giả định demo kéo cả
   release qua cổng production.

**Gate G5:** cân bằng năng lượng, backup và cash flow đạt tolerance đã ký; kết
quả hiển thị khoảng/confidence tương ứng lượng thông tin khách cung cấp.

### Giai đoạn 6 — Cập nhật giao diện và kiểm thử trải nghiệm

**Mục tiêu:** chỉ hiển thị những gì dữ liệu thật cho phép, bằng ngôn ngữ không
gây độ chính xác giả.

1. Hiển thị rõ ngày hiệu lực, nguồn rút gọn, version và trạng thái dữ liệu của
   kết quả; có link/chi tiết “cách tính”.
2. Tách “khách đã cung cấp”, “hệ thống suy ra” và “đang giả định”; nêu lý do khi
   không thể đề xuất gói an toàn.
3. Ẩn hoặc hạ cấp các tỉnh/gói/tính năng chưa `VERIFIED`; không fallback về demo.
4. Nếu R1 chưa duyệt hybrid hoặc money input, ẩn tùy chọn tương ứng thay vì để
   khách đi tới một lỗi không giải thích được.
5. Kiểm thử mobile, keyboard, screen reader, contrast, lỗi mạng và sửa input sau
   khi có kết quả.
6. Thực hiện usability test với 5–8 khách hàng mục tiêu: tỷ lệ hoàn tất ≥85%,
   thời gian nhập kWh trung vị ≤60 giây, không hiểu sai kết quả là báo giá cuối.

**Gate G6:** người dùng hiểu đây là estimate trước khảo sát; không có đường UI
nào hiển thị kết quả từ dataset demo/draft ở production.

### Giai đoạn 7 — Release candidate, pilot và mở production

**Mục tiêu:** mở có kiểm soát, có khả năng dừng và khôi phục.

1. Tạo release bundle bất biến: data files, migration/import report, manifest,
   hashes, chữ ký, golden cases, build SHA và checklist rollback.
2. Chạy trong staging với `NODE_ENV=production`; xác nhận production gate cho
   phép đúng tỉnh/gói đã duyệt và chặn dataset cố ý làm sai hash/status.
3. Chạy toàn bộ lint, type-check, test, build, smoke test API/UI và kiểm tra
   migration/backup/restore Docker.
4. Thiết lập cron production chạy `npm run privacy:purge-calculations` hằng ngày,
   backup SQLite, log lỗi, kiểm tra dung lượng và cảnh báo khi dữ liệu sắp hết
   hiệu lực.
5. Pilot giới hạn: kỹ sư vẫn ra quyết định độc lập, so sánh kết quả app với khảo
   sát thực và ghi sai lệch theo biểu giá, sản lượng, phụ tải, pin, tài chính,
   package.
6. Chỉ mở rộng sau khi pilot đạt ca nghiệm thu đã ký; giữ công tắc tắt calculation
   hoặc rollback về bundle dữ liệu trước nếu phát hiện lỗi.

**Gate G7:** production gate xanh với dữ liệu thật, pilot được ký và quy trình
backup/rollback đã diễn tập.

## 7. Checklist release cho từng dataset

Lặp checklist này với tariff/VAT, catalog gói, solar yield và assumptions.

- [ ] Có release ID và version bất biến.
- [ ] Schema validation và business validation đều pass.
- [ ] Nguồn, người chịu trách nhiệm và hiệu lực đầy đủ.
- [ ] Hash canonical khớp manifest đã ký.
- [ ] Có owner và người duyệt khác vai trò khi phù hợp.
- [ ] Có golden/acceptance cases độc lập và kết quả pass.
- [ ] Preview import đã được review; import có transaction và backup.
- [ ] Snapshot mới chứa đúng data versions/fingerprints.
- [ ] Production gate pass với bundle đúng, fail với dữ liệu giả lập sai.
- [ ] Có rollback release cụ thể và người chịu trách nhiệm kích hoạt.

## 8. Thứ tự ưu tiên để bắt đầu ngay

1. Chỉ định owner/approver và phạm vi tỉnh/gói cho R1.
2. Hoàn tất biểu giá/VAT + hóa đơn ẩn danh + golden cases.
3. Thiết kế pipeline validate/preview/import/version/hash.
4. Thu và duyệt catalog gói thật.
5. Xác định phương pháp sản lượng và chỉ làm các tỉnh R1.
6. Quyết định rõ: hybrid/backup có nằm trong R1 không; nếu không, ẩn khỏi R1.
7. Hiệu chỉnh phụ tải/tài chính từ dữ liệu thực.
8. Chạy staging, pilot và release gate.

Các bước 2–5 có thể chuẩn bị song song về mặt thu thập tài liệu, nhưng chỉ được
tạo một release production sau khi tất cả bốn dataset đã qua gate tương ứng.

## 9. Điều không được làm

- Không chạy `scripts/sync-province-irradiance.ts --mark-verified` để mở
  production. Script hiện chỉ là công cụ thu thập candidate và không thay thế
  mô hình sản lượng hay phê duyệt chuyên môn.
- Không sửa trực tiếp SQLite production hoặc sửa record/version đã có snapshot.
- Không commit hóa đơn, ảnh hóa đơn, PII hoặc bí mật vào repository.
- Không dùng giá package/demo factor làm fallback khi dữ liệu thật thiếu.
- Không bật nhập tổng tiền dựa chỉ trên unit test; bắt buộc có đối soát hóa đơn
  thật và quy tắc làm tròn đã duyệt.
- Không phát hành OCR trước khi có chính sách upload/xóa, benchmark và luồng xác
  nhận của khách.

## 10. Định nghĩa hoàn thành R1

R1 chỉ được gọi là sẵn sàng khi:

1. Tất cả dataset có thể ảnh hưởng kết quả cho tỉnh/gói được mở đều `VERIFIED`
   và khớp manifest hash.
2. Production thực sự chặn dữ liệu thiếu/expired/hash mismatch và không còn demo
   fallback.
3. Nhập kWh, proposal, snapshot và lead hoạt động trên staging/production với
   dữ liệu đã duyệt.
4. Nhập tổng tiền chỉ bật nếu đã qua Gate G2; nếu chưa, UI chủ động chỉ cho nhập
   kWh.
5. Có ít nhất 10 ca nghiệm thu kỹ sư/tài chính độc lập, pilot giới hạn và người
   chịu trách nhiệm ký release.
6. Có backup, retention job, monitoring, rollback và chủ sở hữu vận hành rõ ràng.

Khi R1 đạt, roadmap tiếp theo là R2: sản lượng 12 tháng chi tiết, phụ tải theo
giờ, mô phỏng pin đầy đủ và tài chính dài hạn; OCR vẫn là R3.

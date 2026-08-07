# Bản đặt hàng công việc R1 — dành cho Codex

> **Tài liệu này là yêu cầu từ chủ sở hữu sản phẩm (người kinh doanh, không đọc code).**
> Codex đọc và thực hiện. Mọi câu hỏi kỹ thuật tự quyết theo nguyên tắc ở Phần 2.
> Chỉ hỏi lại chủ sở hữu những việc thuộc **quyết định kinh doanh** (đánh dấu `[CẦN CHỦ SỞ HỮU]`).

---

## Phần 1 — Quyết định kinh doanh đã chốt

Đây là dữ kiện đầu vào, **không thảo luận lại**:

| # | Quyết định | Chốt |
|---|---|---|
| B1 | Phạm vi phục vụ | **Toàn quốc** (có đối tác thi công cả nước) |
| B2 | Gói pin / hybrid | **Sản phẩm chủ lực**, không được ẩn, phải tính đúng |
| B3 | Dữ liệu gói và thiết bị | **Đã có thật, đầy đủ** — sẵn sàng nhập |
| B4 | Mục tiêu công cụ | **Thu thập lead**. Khách xem để quan tâm và để lại liên hệ; con số cuối cùng do kỹ thuật khảo sát quyết định |

### B4 quan trọng nhất — nó định nghĩa "đủ chính xác" là gì

Vì mục tiêu là lead, công cụ **không cần** con số chính xác đến từng đồng, và **không cần** quy trình 6 người ký duyệt như `REAL-DATA-IMPLEMENTATION-ROADMAP.md` mô tả.

Nhưng nó **bắt buộc phải trung thực theo hướng thận trọng**. Lý do thương mại: nếu app hứa tiết kiệm 2 triệu/tháng mà kỹ thuật khảo sát về nói 1,1 triệu, thì lead đó chết và thương hiệu bị hại. Sai số theo hướng hứa hụt (under-promise) là chấp nhận được; sai số theo hướng hứa vượt (over-promise) là **không chấp nhận được**.

**Nguyên tắc hiển thị R1:** mọi con số về sản lượng, tiết kiệm, hoàn vốn đều hiển thị dưới dạng **khoảng** kèm nhãn "ước tính trước khảo sát". Không hiển thị số lẻ đơn nhất (ví dụ cấm "1.547.283 đ/tháng", phải là "1,3 – 1,8 triệu đ/tháng").

---

## Phần 2 — Nguyên tắc bất di bất dịch

Codex tự quyết mọi việc kỹ thuật, miễn không vi phạm:

1. **Thận trọng khi không biết.** Thiếu thông tin thì mở rộng khoảng ước tính và hạ nhãn tin cậy, **không** chọn giả định có lợi cho việc bán hàng.
2. **Mọi hằng số ảnh hưởng kết quả phải có nguồn và có version.** Không hardcode số "cho có" trong file code. Nếu chưa có nguồn thì đánh dấu `[CẦN CHỦ SỞ HỮU]` và để hệ thống báo thiếu, không tự điền.
3. **Không có fallback về dữ liệu demo.** Thiếu dữ liệu thì ẩn tính năng hoặc báo rõ cho khách, không âm thầm dùng số mẫu.
4. **Giữ nguyên các cơ chế an toàn đã có**: data governance status (DEMO/DRAFT/VERIFIED), snapshot bất biến, content hash, chặn production. Không nới lỏng để cho tiện.
5. **Không sửa dataset/version đã phát hành.** Thay đổi tạo version mới.
6. **Không commit dữ liệu khách hàng, hóa đơn, PII, ảnh hóa đơn.**
7. **Mỗi nhiệm vụ phải có test.** Xong nhiệm vụ là `npm run lint && npm run type-check && npm run test:run && npm run build` đều xanh.
8. **Làm tuần tự theo thứ tự nhiệm vụ.** Nhiệm vụ sau phụ thuộc nhiệm vụ trước.

---

## Phần 3 — Các nhiệm vụ

### NV1 — Làm lại mô hình sản lượng theo 12 tháng (chặn mọi việc khác)

**Vấn đề hiện tại**

`src/lib/solar-calculator.ts` tính sản lượng bằng:

```
adjustedGenerationKwh = solarPackage.baseMonthlyGenerationKwh * provinceFactor
```

Ba lỗi trong một dòng:

1. Một con số duy nhất cho cả 12 tháng. Sai nghiêm trọng cho miền Bắc — Hà Nội tháng 2–3 (nồm, mưa phùn) sản lượng chỉ khoảng một nửa tháng 5–6. Vì đã chốt phục vụ toàn quốc (B1), đây là lỗi phải sửa đầu tiên.
2. `provinceFactor` là **tỷ số bức xạ so với TP.HCM**, không phải sản lượng. Dữ liệu hiện có trong DB là tỷ số GHI thô lấy từ NASA POWER (63 bản ghi `DRAFT`) — bức xạ mặt trời chưa qua bất kỳ mô hình hiệu suất nào.
3. `baseMonthlyGenerationKwh` của package đã **ngầm mã hóa sản lượng TP.HCM** (cả 4 gói đều đúng 120 kWh/kWp/tháng — dấu hiệu số bịa). Nghĩa là dữ liệu sản lượng khu vực bị trộn vào dữ liệu sản phẩm. Đổi một cái sẽ âm thầm đổi cái kia.

**Yêu cầu**

Tách hẳn hai khái niệm. Sản lượng trở thành **giá trị dẫn xuất**, không phải giá trị lưu trong bảng package:

```
sản lượng tháng m = capacityKwp
                  × specificYield[tỉnh][m]      (kWh/kWp/tháng, đã qua mô hình)
                  × performanceRatio            (tổn hao hệ thống)
                  × derate(hướng mái, độ nghiêng, bóng che)
```

Việc cụ thể:

1. **Bỏ** cột `baseMonthlyGenerationKwh` khỏi `SolarPackage` và **bỏ** `factor` khỏi `ProvinceFactor`. Viết migration Prisma. Giữ adapter đọc được snapshot cũ (`Calculation.resultJson`) để lịch sử không vỡ.
2. **Tạo bảng dữ liệu sản lượng mới có version**, tối thiểu các trường: mã tỉnh, 12 giá trị `kWh/kWp/tháng`, tổng năm, khoảng P50/P90 (hoặc min/max), tọa độ tham chiếu, cấu hình tham chiếu (độ nghiêng + hướng), bảng tổn hao đã áp, nguồn, phương pháp, `effectiveFrom`/`effectiveTo`, và đầy đủ trường governance như các bảng hiện có.
3. **Không dùng trực tiếp GHI của NASA POWER làm sản lượng.** Phải đi qua mô hình: `specificYield = GHI_nghiêng × PR`. Giá trị `PR` mặc định đề xuất **0,78** cho mái nhà VN (khí hậu nhiệt đới, tổn hao nhiệt cao hơn ôn đới); ghi rõ đây là giả định kỹ thuật cần kỹ sư xác nhận, không phải số đo.
4. **Thêm đầu vào hướng mái và độ nghiêng** vào form (tùy chọn). Nếu khách không biết → dùng cấu hình trung tính và **mở rộng khoảng ước tính**, hạ nhãn tin cậy. Không im lặng giả định hướng Nam tối ưu.
5. **Kết quả trả về phải có sản lượng từng tháng**, không chỉ số bình quân. UI phải hiển thị được biểu đồ 12 tháng để khách miền Bắc thấy trước mùa thấp — đây là công cụ chống khiếu nại sau bán.
6. Script `scripts/sync-province-irradiance.ts` chuyển thành công cụ **thu thập candidate** ghi ra file trong `data/`, không ghi thẳng vào DB. Bỏ hoàn toàn cờ `--mark-verified`.

**7. Cập nhật danh sách tỉnh: 63 → 34 (việc gấp, độc lập với mọi thứ khác)**

Hệ thống đang dùng **danh sách 63 tỉnh đã hết hiệu lực**. Theo Nghị quyết 202/2025/QH15 (Quốc hội thông qua 12/6/2025) và Quyết định 19/2025/QĐ-TTg, từ **01/7/2025** cả nước chỉ còn **34 đơn vị hành chính cấp tỉnh** (28 tỉnh + 6 thành phố).

Hậu quả đang xảy ra trên production-to-be:

- `scripts/province-coordinates.json` có 63 bản ghi, DB có 63 `ProvinceFactor`.
- Selector đang chào các tỉnh **không còn tồn tại**: Bình Dương và Bà Rịa – Vũng Tàu đã nhập vào TP.HCM; Long An đã nhập vào Tây Ninh; Hải Dương vào Hải Phòng; Bình Phước vào Đồng Nai. Riêng seed mặc định trong `src/config/defaults.ts` đang có cả `binh-duong` và `long-an`.
- Khách chọn một tỉnh đã bị xóa tên → dữ liệu lead sai địa bàn, phân công thi công sai.

Việc cụ thể:

- Thay danh sách tỉnh bằng đúng 34 đơn vị theo Quyết định 19/2025/QĐ-TTg. Danh sách đầy đủ kèm bản đồ tỉnh cũ → tỉnh mới đã có sẵn ở sheet `04_VUNG_PHUC_VU` của `docs/templates/Phieu-thu-thap-du-lieu-R1.xlsx`.
- Viết migration ánh xạ tỉnh cũ → tỉnh mới cho `Calculation.province` để lịch sử không mất.
- Giữ bảng alias tên cũ để **tìm kiếm** vẫn ra kết quả (khách vẫn quen gõ "Bình Dương"), nhưng **lưu** bằng mã tỉnh mới.

**Lưu ý kỹ thuật quan trọng phát sinh từ việc sáp nhập:** các tỉnh mới rộng và đa dạng khí hậu hơn nhiều. Ví dụ Lâm Đồng nay gồm Lâm Đồng + Đắk Nông + Bình Thuận — trải từ cao nguyên xuống ven biển; TP.HCM nay gồm cả Bà Rịa – Vũng Tàu. Vì vậy **một con số sản lượng cho mỗi tỉnh giờ càng kém chính xác hơn trước**.

Xử lý: gắn dữ liệu sản lượng theo **vùng khí hậu / điểm tọa độ đại diện**, và cho một tỉnh mới có **nhiều điểm đại diện** nếu cần, thay vì buộc một tỉnh một giá trị. Nếu một tỉnh có nhiều vùng khí hậu mà chỉ có một điểm đo → phải mở rộng khoảng ước tính cho tỉnh đó.

**Tiêu chí hoàn thành**

- [ ] Không còn `baseMonthlyGenerationKwh` và `factor` trong schema và trong engine
- [ ] Cùng một tỉnh, sản lượng tháng 3 và tháng 5 khác nhau
- [ ] Sản lượng năm của Hà Nội thấp hơn TP.HCM, và biên độ dao động theo tháng của Hà Nội **lớn hơn** TP.HCM
- [ ] Khách không khai hướng mái → khoảng ước tính rộng hơn so với khi có khai
- [ ] Snapshot cũ trong DB vẫn đọc và hiển thị được
- [ ] Selector chỉ còn đúng 34 tỉnh/thành; không còn Bình Dương, Bà Rịa – Vũng Tàu, Long An, Hải Dương, Bình Phước… như đơn vị độc lập
- [ ] Gõ tên tỉnh cũ vẫn tìm ra tỉnh mới tương ứng
- [ ] Calculation cũ vẫn truy được sau migration ánh xạ tỉnh
- [ ] Test: seasonality, dẫn xuất sản lượng, derate, tương thích snapshot cũ, ánh xạ 63→34, alias tên cũ

---

### NV2 — Đường nhập dữ liệu thật (mở nút thắt lớn nhất)

**Vấn đề hiện tại**

Chủ sở hữu **đã có dữ liệu thật** (B3) nhưng **không có cách nào nạp vào hệ thống**. `package.json` chỉ có `db:seed` (nạp dữ liệu demo) và `purge-expired-calculations`. Roadmap có mô tả `data:validate` / `data:preview` / importer nhưng **chưa ai viết**. Con đường duy nhất còn lại là sửa tay file SQLite — chính roadmap cấm việc này.

**Yêu cầu**

Dựng đúng pipeline mà `docs/REAL-DATA-IMPLEMENTATION-ROADMAP.md` Giai đoạn 1 đã đặc tả:

1. `npm run data:validate -- <thư-mục-release>` — chỉ đọc, in lỗi theo từng dòng/cột, không ghi DB. Kiểm tra: đơn vị, khoảng giá trị hợp lý, ngày hiệu lực, model trùng, mã tỉnh không hợp lệ, version chồng lấn, gói thiếu thiết bị.
2. `npm run data:preview -- <thư-mục-release>` — so sánh với DB hiện tại, in rõ sẽ thêm/sửa/vô hiệu bản ghi nào, tính SHA-256 canonical.
3. `npm run data:import -- <thư-mục-release>` — nhập trong **một transaction**: hoặc toàn bộ, hoặc không gì cả. Có backup DB trước, có đường rollback về version trước. Bản ghi mới vào ở trạng thái `DRAFT`.
4. Schema Zod cho từng loại dataset: gói sản phẩm, thiết bị, sản lượng khu vực, giả định tính toán.
5. `data-release/<version>/MANIFEST.md` ghi metadata không nhạy cảm: dataset, nguồn, người chịu trách nhiệm, hiệu lực, người duyệt, hash.
6. **Không tạo bất kỳ đường nào tự nâng dữ liệu lên `VERIFIED`** — kể cả cờ dòng lệnh. Việc lên `VERIFIED` phải qua thay đổi code được review.

**Định dạng đầu vào** — Codex tự chọn CSV hoặc JSON, ưu tiên thứ chủ sở hữu xuất được từ Excel dễ nhất. Phải kèm 1 file mẫu đã điền để chủ sở hữu biết điền vào đâu.

`[CẦN CHỦ SỞ HỮU]` Sau khi Codex làm xong, chủ sở hữu điền dữ liệu thật vào file mẫu và chạy `data:validate`.

**Tiêu chí hoàn thành**

- [ ] Cùng một bộ input chạy 2 lần cho ra cùng một content hash
- [ ] Import lỗi giữa chừng không để lại bản ghi dở dang
- [ ] Có file mẫu đã điền ví dụ, kèm hướng dẫn ngắn bằng tiếng Việt cho người không biết code
- [ ] Không có đường nào (UI hay script) tự phê duyệt dữ liệu
- [ ] Test: input sai định dạng, import thất bại giữa chừng, hash lệch, version trùng, rollback

---

### NV3 — Sửa lỗi thổi phồng tỷ lệ tự dùng (lỗi ảnh hưởng kết quả nặng nhất)

**Vấn đề hiện tại**

Trong `calculateScenario()`:

```
directSolarUseKwh = min(sản lượng cả tháng, nhu cầu ban ngày cả tháng)
```

Phép này ngầm giả định điện sản xuất trưa thứ Ba có thể bù cho nhu cầu tối Chủ Nhật. Thực tế thừa và thiếu xảy ra **theo từng giờ** và không bù trừ được.

Hệ quả định lượng: hộ gia đình grid-tied không pin ở VN thường tự dùng được **35–55%** sản lượng. Công thức hiện tại sẽ cho ra **80–100%**. Nghĩa là tiết kiệm bị thổi lên và thời gian hoàn vốn bị rút ngắn — đúng hướng nguy hiểm nhất cho một công cụ bán hàng, và vi phạm nguyên tắc B4.

Ba mức `daytimeLowRatio: 0.3 / Medium: 0.5 / High: 0.75` cũng chỉ là số demo chưa nghiệm thu.

**Yêu cầu**

1. Thay tổng hợp theo tháng bằng **cân bằng năng lượng theo giờ**: profile phụ tải 24 giờ × 12 tháng, profile sản lượng 24 giờ × 12 tháng, đối chiếu từng giờ rồi mới tổng hợp lên tháng.
2. Nếu chưa có dữ liệu phụ tải thật để dựng profile: dùng **profile đại diện có nguồn** cho hộ gia đình VN (đặc trưng: đỉnh tối 18–22h do điều hòa và nấu ăn, trũng ban ngày với hộ đi làm). Ghi rõ nguồn và đánh dấu là giả định.
3. Ba lựa chọn "dùng điện ban ngày ít / trung bình / nhiều" của khách trở thành **lựa chọn profile**, không phải một tỷ lệ phần trăm phẳng.
4. Kết quả phải phơi ra được `selfConsumptionRate` và so sánh được với dải tham chiếu 35–55% (không pin). Nếu mô hình cho ra ngoài dải này mà không có lý do rõ ràng → coi là lỗi.
5. Bỏ dòng `billAfterSolarVnd = clamp(tieredBill, 0, monthlyBill)`. Đây là phép trộn hai đại lượng khác bản chất: `tieredBill` là tiền điện năng trước VAT do biểu giá tính ra, còn `monthlyBill` là tổng tiền khách khai (có thể đã gồm VAT và khoản khác). So sánh trực tiếp gây lệch. Phải chuẩn hóa về cùng một cơ sở trước khi trừ.

**Tiêu chí hoàn thành**

- [ ] Gói grid-tied không pin, hộ dùng điện ban ngày trung bình → `selfConsumptionRate` nằm trong 35–55%
- [ ] Tăng công suất gói mà giữ nguyên tiêu thụ → `selfConsumptionRate` **giảm** (vì dư nhiều hơn). Hiện tại mô hình cũ không thể hiện đúng quan hệ này.
- [ ] Không còn phép `clamp` trộn hai cơ sở tính khác nhau
- [ ] Test: cân bằng năng lượng theo giờ, quan hệ nghịch giữa cỡ hệ thống và tỷ lệ tự dùng, so sánh với dải tham chiếu

---

### NV4 — Mô hình pin lưu trữ đúng (vì hybrid là sản phẩm chủ lực)

**Vấn đề hiện tại**

```
khả năng xả tháng = batteryCapacityKwh × 30 ngày × cycleFactor × RTE
```

Với `cycleFactor = 1` và `RTE = 0,9`, pin 5 kWh cho ra 135 kWh/tháng. Mô hình này thiếu: DoD (độ sâu xả), SOC tối thiểu, giới hạn công suất nạp/xả, và giả định **ngày nào cũng có đủ điện dư để nạp đầy** — điều không đúng vào những ngày mưa hoặc mùa thấp ở miền Bắc.

Vì hybrid là gói đắt nhất (B2), sai ở đây tốn nhiều tiền nhất cho cả khách và uy tín công ty.

**Yêu cầu**

1. Mô phỏng **SOC theo giờ**, không dùng công thức một chu kỳ đầy mỗi ngày. Pin chỉ nạp được khi thực sự có điện dư ở giờ đó, chỉ xả được khi thực sự có nhu cầu.
2. Bổ sung vào dữ liệu gói: dung lượng khả dụng (usable kWh), DoD, SOC tối thiểu, công suất nạp/xả tối đa (kW), hiệu suất vòng, số vòng đời bảo hành. `[CẦN CHỦ SỞ HỮU]` — lấy từ datasheet nhà cung cấp.
3. **Xử lý đúng xung đột giữa dự phòng và tiết kiệm.** Đây là điểm mô hình hiện tại bỏ qua hoàn toàn: nếu khách yêu cầu dự phòng mất điện, một phần dung lượng phải **giữ lại thường trực** cho tình huống mất điện, và phần đó **không dùng để tiết kiệm tiền điện được**. Càng yêu cầu dự phòng nhiều thì tiết kiệm càng ít. Kết quả phải nói rõ sự đánh đổi này cho khách.
4. Kiểm tra tính khả thi của yêu cầu dự phòng: `essentialLoadWatts` và `backupHours` khách nhập phải được đối chiếu với dung lượng khả dụng **và** công suất xả tối đa của pin. Không đủ thì nói thẳng "gói này không đáp ứng được", kèm lý do.

**Tiêu chí hoàn thành**

- [ ] Cùng một gói pin: khách yêu cầu dự phòng → tiết kiệm hàng tháng **thấp hơn** so với khách không yêu cầu. Mô hình hiện tại không phân biệt được.
- [ ] Tháng mùa thấp ở miền Bắc → sản lượng pin đóng góp thấp hơn tháng cao điểm
- [ ] Yêu cầu dự phòng vượt khả năng pin → báo không đáp ứng, kèm lý do cụ thể
- [ ] Test: mô phỏng SOC, giới hạn công suất xả, dung lượng dự phòng bị khóa, ngày mưa liên tiếp

---

### NV5 — Dòng tiền dài hạn (hiện đang tuyến tính, thiếu toàn bộ yếu tố dài hạn)

**Vấn đề hiện tại**

```
createCashFlow: cumulativeCashFlow = -giá + tiếtKiệmNăm × số_năm
```

Một đường thẳng suốt 20 năm. Thiếu toàn bộ: suy giảm tấm pin, trượt giá điện, chi phí bảo trì và vệ sinh, **thay inverter năm 10–12**, **thay pin** (rất quan trọng vì hybrid là gói chủ lực).

Ngoài ra `systemLifetimeYears` và `maintenanceRatePerYear` **có trong schema, có trong màn hình quản trị, có validation — nhưng không hàm nào dùng đến**. Chúng là setting chết, tạo ảo giác rằng mô hình đã tính đến chúng. Chân trời 20 năm đang là hằng số hardcode, không đọc từ `systemLifetimeYears`.

**Yêu cầu**

1. Đưa vào dòng tiền, mỗi tham số là dữ liệu có version và có nguồn:
   - **Suy giảm tấm pin** — đề xuất mặc định năm 1 khoảng 2%, sau đó 0,5%/năm. Đối chiếu bảo hành hiệu suất trên datasheet nhà cung cấp.
   - **Trượt giá điện bán lẻ** — dữ liệu lịch sử: 1.920,37 (5/2023) → 2.006,79 (11/2023) → 2.103,11 (10/2024) → 2.204,07 đ/kWh (10/5/2025). Trung bình gần đây khoảng +4,8%/năm, và trong 16 năm **chưa có lần nào giảm**. Đề xuất dùng mức thận trọng **4%/năm** cho kịch bản tiêu chuẩn, và **0%/năm** cho kịch bản thận trọng.
   - **O&M và vệ sinh** — `[CẦN CHỦ SỞ HỮU]`, theo chính sách bảo trì thực tế của công ty.
   - **Thay inverter** — `[CẦN CHỦ SỞ HỮU]` năm thay và chi phí. Mốc thông thường năm 10–12.
   - **Thay pin** — `[CẦN CHỦ SỞ HỮU]` năm thay và chi phí. Bắt buộc phải có vì hybrid là gói chủ lực; đây có thể là khoản xóa sạch phần tiết kiệm nửa sau vòng đời.
2. Dùng `systemLifetimeYears` từ settings thay cho hằng số 20 năm hardcode. Nếu quyết định không dùng thì **xóa** khỏi schema và màn hình quản trị — không để setting chết.
3. **Không hiển thị NPV hoặc IRR** ở R1. Chưa có tỷ lệ chiết khấu được chủ sở hữu quyết định, và mục tiêu là lead chứ không phải hồ sơ đầu tư.
4. Thời gian hoàn vốn hiển thị dạng **khoảng** (ví dụ "khoảng 5–8 năm"), tính từ kịch bản thận trọng đến thuận lợi.

**Tiêu chí hoàn thành**

- [ ] Dòng tiền không còn là đường thẳng; có bậc nhảy ở năm thay inverter và năm thay pin
- [ ] Kịch bản thận trọng (trượt giá 0%) cho hoàn vốn **dài hơn** kịch bản tiêu chuẩn
- [ ] Không còn setting nào tồn tại trong schema mà engine không dùng
- [ ] Không có NPV/IRR trên UI
- [ ] Test: suy giảm, trượt giá, năm thay thiết bị, khoảng hoàn vốn

---

### NV6 — Doanh thu bán điện dư theo Nghị định 58/2025

**Vấn đề hiện tại**

`solarSurplusKwh` được tính nhưng chỉ dùng để nạp pin, **không bao giờ quy ra tiền**. Với gói grid-tied không pin, toàn bộ điện dư hiện coi như bằng 0 đồng.

**Cơ sở pháp lý** — Nghị định 58/2025/NĐ-CP, hiệu lực 03/3/2025 (bãi bỏ Nghị định 135/2024/NĐ-CP):

- Điện mặt trời mái nhà tự sản xuất tự tiêu thụ, công suất dưới 100 kW, **được bán điện dư** cho EVN.
- Sản lượng được thanh toán **không vượt quá 20%** sản lượng phát tại đầu ra inverter (bao gồm cả sản lượng qua hệ thống lưu trữ, nếu có). Dư quá 20% thì chỉ được thanh toán bằng 20%; dư dưới 20% thì được thanh toán toàn bộ theo công tơ.
- Giá mua = **giá điện năng thị trường điện bình quân năm trước liền kề**, do đơn vị vận hành thị trường điện **công bố trong tháng 01 hàng năm**, và không cao hơn mức giá tối đa của khung giá điện mặt trời mặt đất.
- Bên mua là công ty con hoặc đơn vị trực thuộc các Tổng công ty Điện lực thuộc EVN.

**Yêu cầu**

1. Thêm dataset **giá mua điện dư** vào registry có version, cấu trúc tương tự `data/electricity-tariffs.json`: giá, năm áp dụng, nguồn công bố, `effectiveFrom`/`effectiveTo`, trạng thái governance. Giá này **đổi mỗi năm vào tháng 1** — bắt buộc có `effectiveTo`.
2. Áp **đúng trần 20%** khi tính doanh thu. Bỏ trần là over-promise; bỏ luôn khoản thu là under-promise. Cả hai đều sai, nhưng phải làm đúng.
3. Nếu chưa có giá được công bố cho kỳ đang tính → **trả về thiếu dữ liệu**, không dùng giá năm cũ, không tự nội suy.
4. Kiểm tra ngưỡng công suất: gói vượt 100 kW không áp cơ chế này. (Không ảnh hưởng gói hộ gia đình hiện tại nhưng phải chặn đúng.)
5. Hiển thị doanh thu điện dư **tách riêng** khỏi tiền tiết kiệm hóa đơn. Hai khoản này khác bản chất và khách cần hiểu rõ.

`[CẦN CHỦ SỞ HỮU]` Xác nhận công ty có thực sự hỗ trợ khách làm thủ tục đấu nối và bán điện dư hay không. Nếu **không** hỗ trợ thì **không được** đưa khoản thu này vào kết quả, vì khách sẽ không thực nhận được.

**Tiêu chí hoàn thành**

- [ ] Điện dư vượt 20% chỉ được thanh toán đúng 20%
- [ ] Thiếu giá cho kỳ tính → báo thiếu dữ liệu, không tự nội suy
- [ ] Doanh thu điện dư hiển thị tách khỏi tiết kiệm hóa đơn
- [ ] Test: trần 20%, thiếu giá, chuyển giao năm, ngưỡng 100 kW

---

### NV7 — Trình bày kết quả theo đúng mục tiêu thu lead

**Vấn đề hiện tại**

UI trình bày con số như thể chúng chính xác, trong khi nền dữ liệu và mô hình chỉ đủ cho ước lượng. Với mục tiêu thu lead (B4), đây là rủi ro thương hiệu chứ không phải rủi ro kỹ thuật.

**Yêu cầu**

1. **Mọi con số về sản lượng, tiết kiệm, hoàn vốn hiển thị dạng khoảng.** Cấm hiển thị số lẻ đơn nhất. Làm tròn về đơn vị mà khách cảm nhận được (trăm nghìn đồng, năm).
2. **Tách rõ ba loại thông tin** trong phần kết quả: khách đã cung cấp / hệ thống suy ra / hệ thống đang giả định. Phần giả định phải xem được chi tiết.
3. **Nhãn tin cậy** thay đổi theo lượng thông tin khách cung cấp. Khách khai 12 tháng kWh + biết hướng mái + biết diện tích → tin cậy cao, khoảng hẹp. Khách khai 1 tháng và không biết gì thêm → tin cậy thấp, khoảng rộng, và nói thẳng lý do.
4. **Biểu đồ sản lượng 12 tháng** hiển thị cho khách thấy mùa thấp. Đặc biệt quan trọng với khách miền Bắc.
5. **Với gói pin: nói rõ sự đánh đổi** giữa dự phòng mất điện và tiết kiệm tiền điện.
6. Câu chốt trước form lead phải nói rõ đây là ước tính trước khảo sát, con số cuối do kỹ thuật xác định sau khi xem mái thực tế.
7. Ẩn hoặc hạ cấp tỉnh nào chưa có dữ liệu sản lượng đã duyệt. **Không fallback về số demo.**

**Tiêu chí hoàn thành**

- [ ] Không còn con số lẻ đơn nhất nào trên màn hình kết quả
- [ ] Khách khai ít thông tin → khoảng rộng hơn rõ rệt, có giải thích
- [ ] Có biểu đồ 12 tháng
- [ ] Gói pin thể hiện được đánh đổi dự phòng ↔ tiết kiệm
- [ ] Test giao diện: các mức thông tin đầu vào khác nhau, tỉnh chưa có dữ liệu, gói không đáp ứng dự phòng

---

### NV8 — Cảnh báo dữ liệu hết hiệu lực

**Vấn đề hiện tại**

Schema có `effectiveTo` nhưng **không có job nào cảnh báo sắp hết hạn**, không có ai được gán lịch review.

Rủi ro thực tế: giá điện VN điều chỉnh gần như mỗi năm (5/2023, 11/2023, 10/2024, 5/2025). Giá mua điện dư công bố lại **mỗi tháng 1**. Kịch bản xấu: tốn nhiều tháng đưa dữ liệu lên `VERIFIED`, vài tháng sau EVN tăng giá, không ai biết, hệ thống tiếp tục báo giá cũ **với nhãn "đã xác minh"** — nguy hiểm hơn cả nhãn DEMO, vì không còn cảnh báo nào.

**Yêu cầu**

1. Job định kỳ kiểm tra mọi dataset, cảnh báo khi còn dưới N ngày là hết hiệu lực (N mặc định 30, cấu hình được).
2. Dataset đã hết hiệu lực → **chặn dùng cho phép tính mới**, không âm thầm dùng tiếp.
3. Màn hình quản trị hiển thị bảng trạng thái tất cả dataset: version, hiệu lực, còn bao nhiêu ngày, ai chịu trách nhiệm.
4. Ghi vào tài liệu: giá điện bán lẻ cần review sau mỗi lần EVN điều chỉnh; giá mua điện dư review vào tháng 1 hàng năm.

**Tiêu chí hoàn thành**

- [ ] Dataset hết hiệu lực chặn được phép tính mới
- [ ] Job cảnh báo chạy được và báo đúng
- [ ] Màn hình quản trị xem được trạng thái mọi dataset
- [ ] Test: sắp hết hạn, đã hết hạn, không có ngày hết hạn

---

## Phần 4 — Việc không làm ở R1

Cắt hẳn, không thảo luận:

- **OCR hóa đơn** — để R3
- **Nhập tổng tiền điện để suy ngược kWh** — giữ nguyên trạng thái đang chặn ở production. Chỉ mở sau khi có đối soát hóa đơn thật đã ký (Gate G2 trong roadmap cũ). R1 chỉ cho nhập kWh.
- **NPV, IRR, tỷ lệ chiết khấu** — không phù hợp mục tiêu thu lead
- **Mở rộng thêm trang quản trị** — giữ nguyên phần đang có
- **Mô phỏng bóng râm bằng ảnh vệ tinh** — quá sớm
- **Tích hợp API EVN** — quá sớm
- **Đổi SQLite sang database khác** — chỉ làm khi lượng truy cập thật đòi hỏi, không làm trước

---

## Phần 5 — Dữ liệu chủ sở hữu cung cấp

**Đã có file thu thập:** `docs/templates/Phieu-thu-thap-du-lieu-R1.xlsx`

File này là **nguồn dữ liệu chính thức** cho R1. Codex đọc nó để biết đầu vào sẽ có những trường gì, và thiết kế schema Zod của NV2 khớp với nó.

| Sheet | Nội dung | Dùng cho |
|---|---|---|
| `01_CAU_HOI_CHINH` | 39 câu hỏi cấp quyết định kinh doanh (25 câu P0) | NV2, NV4, NV5, NV6, NV7 |
| `02_GOI_SAN_PHAM` | Gói đang bán — **cố tình không có** cột sản lượng nền | NV2 |
| `03_THIET_BI` | Thông số tấm pin / inverter / pin theo datasheet | NV2, NV4, NV5 |
| `04_VUNG_PHUC_VU` | 34 tỉnh sau sáp nhập + bản đồ tỉnh cũ → mới + mức phục vụ | NV1, NV7 |
| `05_HOA_DON_MAU` | Hóa đơn EVN ẩn danh để hiệu chỉnh phụ tải | NV3 |
| `06_VIEC_KY_SU` | 6 việc cần kỹ sư, không phải chủ sở hữu | NV1, NV3 |
| `07_KHONG_CAN_DIEN` | Những trường đã lỗi thời, không được yêu cầu điền | tham chiếu |

**Quan trọng:** mẫu cũ `docs/templates/Mau-thu-thap-du-lieu-dien-mat-troi.xlsx` đã bị thay thế. Không dùng nó làm hợp đồng dữ liệu vì có ba chỗ sai lệch: sheet `BIEU_GIA_DIEN` ghi cấu trúc 5 bậc trong khi biểu giá thực tế là 6 bậc; `GOI_SAN_PHAM` còn cột sản lượng nền sẽ bị bỏ ở NV1; danh sách tỉnh theo 63 đơn vị cũ.

**Nguyên tắc xử lý ô trống:** nếu chủ sở hữu ghi "chưa biết" hoặc để trống một trường, Codex **không được tự điền giá trị mặc định có lợi**. Hệ thống phải nới rộng khoảng ước tính, hạ nhãn tin cậy và nói rõ đang thiếu thông tin gì.

---

## Phần 6 — Thứ tự thực hiện

```
NV1 (mô hình sản lượng 12 tháng)     ← làm trước, chặn mọi việc khác
  └─ NV2 (đường nhập dữ liệu)        ← mở nút thắt, chủ sở hữu đã có dữ liệu
       ├─ NV3 (sửa tỷ lệ tự dùng)    ← lỗi ảnh hưởng kết quả nặng nhất
       │    └─ NV4 (mô hình pin)     ← hybrid là gói chủ lực
       │         └─ NV5 (dòng tiền dài hạn)
       ├─ NV6 (điện dư ND58/2025)
       └─ NV8 (cảnh báo hết hiệu lực)
            └─ NV7 (trình bày kết quả)  ← làm sau cùng, khi số đã đúng
```

Sau **mỗi** nhiệm vụ: chạy `npm run lint && npm run type-check && npm run test:run && npm run build`, báo lại cho chủ sở hữu bằng **ngôn ngữ kinh doanh** (thay đổi gì, khách sẽ thấy khác ra sao, còn thiếu gì), không báo bằng thuật ngữ kỹ thuật.

---

## Phần 7 — Định nghĩa hoàn thành R1

1. Toàn bộ dữ liệu gói, thiết bị, doanh nghiệp là dữ liệu thật, nhập qua pipeline có review — không còn giá trị demo nào lộ ra cho khách.
2. Sản lượng tính theo 12 tháng, có dữ liệu cho mọi tỉnh đang mở; tỉnh chưa có dữ liệu thì bị ẩn.
3. Tỷ lệ tự dùng nằm trong dải hợp lý theo tham chiếu ngành, không còn thổi phồng do tổng hợp theo tháng.
4. Gói pin mô phỏng SOC theo giờ và thể hiện được đánh đổi dự phòng ↔ tiết kiệm.
5. Dòng tiền có suy giảm, trượt giá, O&M, thay inverter và thay pin.
6. Mọi con số hiển thị dạng khoảng, có nhãn tin cậy, có mục xem giả định.
7. Có cảnh báo dữ liệu hết hiệu lực và người chịu trách nhiệm cho từng dataset.
8. Nhập tổng tiền vẫn đóng ở production; UI chủ động chỉ cho nhập kWh.

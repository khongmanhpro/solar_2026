# Đối chiếu khóa học NLMT (Thầy Ngô Phi Thường, 05/2026) với engine

> Nguồn: 230 trang slide (đọc hình ảnh từng trang) và 7 buổi video (phiên âm tự động, nhiều lỗi thuật ngữ và số).
> Các số trong phiên âm cần đối chiếu lại với video trước khi dùng để ra quyết định.
> Mục này chỉ đối chiếu với engine khách hàng. Các quy tắc thi công được ghi riêng ở cuối để đội lắp đặt dùng.

## 1. Chỗ engine khách hàng cần đổi (ảnh hưởng số khách thấy)

| # | Hạng mục | Khóa học | Engine hiện tại | Đề xuất |
|---|---|---|---|---|
| 1 | Thay pin lưu trữ | Ắc quy chì 3–5 năm, lithium 5–10 năm (p.35, p.113; buổi 6). Slide ghi "thay sau 5–7 năm" (p.25) | Năm 12 | Đổi sang năm 10 (đầu bảo hành pin LFP thường 10 năm). Đây là chỗ engine lạc quan nhất |
| 2 | Độ sâu xả (DoD) pin lithium | 80% (p.113, buổi 6). Chì-axit 50% | 90% | Đổi sang 80% để khớp khóa học; ghi chú nguồn |
| 3 | Thay inverter | Khóa học không nêu | Năm 12 | Giữ, ghi là giả định (không có nguồn khóa học) |
| 4 | Tăng giá điện | 6%/năm (p.223, p.228, buổi 8), nhưng bảng tính p.229 dùng 3%/năm | 3%/năm | Giữ 3% (thận trọng); thêm kịch bản 6% để so sánh |
| 5 | Suy giảm tấm pin | 0,6%/năm (p.228) | 1% năm đầu, 0,5%/năm sau | Đổi thành 0,6%/năm cho khớp khóa học, hoặc giữ số Risen và ghi nguồn |
| 6 | Bảo trì | ≈3% doanh thu hoặc ≈0,8% vốn/năm (p.228) | 0,8% giá gói/năm (mặc định mới) | Khớp |
| 7 | Điện dư | Quy định 20% sản lượng (slide 05/2026, trước NĐ 243). Hệ số tính 6 hoặc 8, K_TK 80% hoặc 95%: tài liệu mâu thuẫn chính nó (p.14, p.96, p.104) | 50% sản lượng (NĐ 243/2026), giá ~800 đ/kWh, không cộng vào hoàn vốn | Giữ theo NĐ 243 (mới hơn). Giá 800 đ/kWh vẫn chưa kiểm chứng |
| 8 | Chi phí đầu tư | Hòa lưới 7–8 triệu/kWp; hybrid thêm 3 triệu/kWh pin (p.25). Ví dụ p.228 dùng 5,5 triệu/kWp | Catalog ~18,8 triệu/kWp cho hybrid 5,84 kWp + 16 kWh | Cần quyết định: giữ giá đại lý thực tế (thị trường 2026 đang cao hơn quy tắc khóa học) hay dùng quy tắc của khóa học. Xem mục 4 |
| 9 | Giờ nắng Hà Nội | 3,2 h/ngày (p.7, buổi 1); Excel khóa học cho 1.174 kWh/kWp/năm | PVGIS 1.028 kWh/kWp/năm (~2,8 h) | Đã biết từ trước: nghi ngờ ERA5 đánh giá thấp miền Bắc. Cần kỹ sư chọn nguồn |
| 10 | Ngưỡng nên lắp | Bắc > 300 kWh/tháng, Nam > 400 kWh/tháng; hệ tối thiểu ~3 kW (p.11) | Engine loại khách dưới ngưỡng bằng "không có lợi về kinh tế" | Khớp về hướng; ghi thêm câu "theo khóa học, nhà dưới 300–400 kWh thường không đáng lắp" |
| 11 | Dự phòng pin | E_pin = E_tải × số ngày / (η_inv × η_dây × DoD × η_nhiệt) (p.113) | Dự phòng = tải × giờ / 0,9, không nhân DoD (DoD đã nằm trong dung lượng khả dụng) | Khớp về kết quả; bổ sung η_dây và η_nhiệt nếu muốn sát khóa học |

## 2. Ví dụ hộ dân của thầy có vấn đề (cần biết trước khi dùng làm mẫu)

Buổi 8 (~00:52–00:58) và slide p.199: hóa đơn 1,85 triệu, 609 kWh/tháng, mái cho hệ 2,25 kWp (có bản ghi 2,5), pin 10 kWh. Thầy tính:

- Điện tự dùng = 0,8 × (8,12 + 0,8 × 10) ≈ 12,9 kWh/ngày ≈ **387 kWh/tháng**.
- Sản lượng 2,25 kWp × ~1.300 kWh/kWp/năm ≈ **244 kWh/tháng**.

Điện tự dùng lớn hơn sản lượng của hệ, nên ví dụ này không nhất quán. Tiết kiệm 1,3 triệu/tháng không khớp với 2,25 kWp. Engine có thể dùng như ca kiểm chứng: nhập 609 kWh, ban ngày 40%, và xem gói nào được đề xuất và tiết kiệm bao nhiêu.

## 3. Ghi chú về phương pháp (không cần sửa engine)

- Khóa học dùng công thức đơn giản: kWp = kWh/ngày ÷ giờ nắng (3,2 Bắc, 4 Nam). Engine dùng PVGIS theo tháng và mô phỏng theo giờ, nên chính xác hơn. Hai cách cho kết quả gần nhau ở TP.HCM (4,16 h tương đương) nhưng lệch ở Hà Nội.
- Khóa học không có hệ số nhiệt độ, không có suy giảm theo năm đầy đủ, không có bảng tổn thất tổng hợp. Engine dùng PVGIS (đã gồm ~14% tổn thất hệ thống và nhiệt độ).
- Khóa học chưa xử lý che bóng và bụi. Engine cũng chưa, cần ghi cảnh báo cho khách có mái bị che.
- Phân bổ ban ngày/đêm: khóa học 30/70 hoặc 40/60 (buổi 8). Engine có 3 mức 30/50/75%. Khớp.

## 4. Quyết định đã chốt (12/10/2026, theo góc nhìn khách hàng: thận trọng, không tự lừa mình)

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Thay pin | Năm 10 (trước đây 12) | Lithium sống 5–10 năm theo khóa học; chọn đầu trên |
| DoD pin | 80% (trước đây 90%) | Khớp khóa học; khách không bị hụt điện dự phòng so với lời hứa |
| Suy giảm tấm | 1% năm đầu, sau đó 0,6%/năm (trước đây 0,5%) | Khớp khóa học và Excel (năm 10 ≈ giảm 6%) |
| Chi phí đầu tư | Giữ giá catalog thực tế | Khách trả giá thật; giá khóa học thấp hơn ~20% so với thị trường 2026 |
| Tăng giá điện | Giữ 3%/năm, thêm dòng "nếu tăng 6%/năm, hoàn vốn còn…" | Khách thấy cả kịch bản thận trọng lẫn kịch bản khóa học nêu |
| Thay inverter | Giữ năm 12 | Khóa học không nêu; ghi là giả định |

**Tác động thực tế (đã chạy lại ma trận ca trên server):** nhỏ hơn dự đoán ban đầu, vì hoàn vốn thường xảy ra trước năm thay pin.
Ca có pin và dự phòng bị ảnh hưởng nhiều nhất: HCM 450 kWh có dự phòng 1 kW × 4 giờ từ 7,1 lên 7,6 năm. Các ca khác gần như không đổi
(HCM 450 kWh: 6,7 năm; Hà Nội 450 kWh: 6,2 năm; HCM 800 kWh: 2,8 năm). Thay pin sớm hơn chủ yếu làm giảm NPV và tiết kiệm ròng 20 năm.
Nếu giá điện tăng 6%/năm, hoàn vốn ngắn hơn khoảng 0,4–0,6 năm.

## 5. Dành cho đội lắp đặt (không đưa vào sản phẩm khách hàng)

Những điểm dưới đây đúng với thực hành chuẩn hoặc nguy hiểm; ghi lại để làm checklist khảo sát và thi công:

- **Đấu nối và bảo vệ:**
  - CB phải phối hợp với dây: In ≤ Iz. Khóa học có chỗ chọn CB 125–150 A cho dây 80 A và nói "càng cao càng tốt". Đây là sai, CB quá lớn không bảo vệ được dây.
  - Dòng 20,9 A chọn CB 25 A là quá sát. Theo hệ số thiết kế (thường 1,25 × I_max) và tiêu chuẩn.
  - Quy tắc "mm² = kW" cho cáp không đúng. Phải tính theo dòng, sụt áp và cách lắp.
- **An toàn:**
  - Micro-inverter không được cắm thẳng vào ổ cắm dân dụng (buổi 4).
  - Không chọt bút thử điện bằng tay trần (buổi 4).
  - Không đấu ngõ backup vào lưới EVN (buổi 5). Kết luận cuối của thầy đúng, nhưng có lúc nói ngược lại.
  - Pin lithium vẫn cần CB/cầu chì DC đúng quy chuẩn, không dựa riêng vào BMS hay công tắc trong pin (buổi 5 nói ngược).
  - Cầu chì DC: buổi 1 nói "không nên dùng" là sai với thực hành chuẩn khi có nhiều chuỗi.
- **Điện áp chuỗi:** Voc phải hiệu chỉnh theo nhiệt độ thấp nhất (trời lạnh Voc tăng). Khóa học không nêu. Đây là kiểm tra bắt buộc khi thiết kế chuỗi, dù engine khách hàng không làm.
- **Đo lường:** CT đứt → đo sai, có thể phát lên lưới. CT kẹp đúng chiều, tại điểm hòa lưới. Xa biến tần thì dùng công tơ RS485.
- **Bám tải và điện dư:** cần công tơ hai chiều; công tơ một chiều ghi cả chiều phát ngược như tiêu thụ (buổi 1).
- **Dây và bảo vệ AC/DC:** SPD phải tiếp địa; khung pin phải tiếp địa; tiếp địa riêng, không dùng chung với chống sét tòa nhà.
- **Vận hành:** kiểm tra cách điện 6 tháng/lần; chụp nhiệt MC4 và hộp nối; đo I–V; vệ sinh bằng nước sinh hoạt, không dùng nước sông hay nước muối.
- **Pháp lý:** bài giảng nói "chưa có phạt phát lưới" (buổi 1) là thông tin đã cũ. Nghị định 133/2026 có mức phạt tới 100 triệu cho việc không thông báo. Checklist thủ tục trong sản phẩm dựa trên NĐ 58/2025 sửa đổi bởi NĐ 243/2026, không dựa trên bài giảng.
- **PCCC:** khoảng cách nhóm pin ≤ 40 m × 40 m, cách nhau ≥ 1,5 m, cách lan can 2,5 m; cách lối thoát 3 m; không đặt trên mái vật liệu cháy; ưu tiên micro-inverter và pin tinh thể (slide p.193–194).
- **Thiếu trong khóa học:** hiệu chỉnh nhiệt độ Voc, ngưỡng sụt áp, điện trở tiếp địa cụ thể, tải trọng gió và kết cấu, checklist nghiệm thu trước khi đóng điện, nhãn và biển báo.

## 6. Các khuyến nghị sai hoặc không an toàn trong bài giảng (không dùng làm chuẩn)

- Hướng Bắc "tạm ổn" cho bán cầu Bắc (buổi 3). Phải hướng Nam.
- Sạc trực tiếp bình khi không có bộ điều khiển (buổi 3).
- Dùng tấm nứt cho bơm vì rẻ (buổi 3). Trái nguyên tắc, nguy cơ điểm nóng và cháy.
- Kéo tay tấm pin qua mép gạch (buổi 7). (Đính chính 09/11: buổi 7 nói đúng về vít — "xà gồ gỗ thì vít gỗ, xà gồ sắt dùng vít sắt" — và đúng về xếp ≤ 10–12 tấm, không đứng lên tấm pin.)
- (Đính chính 09/11: pin 15 kWh xả 5 kW hết sau 3 giờ là phép tính đúng; ý của thầy là công suất xả của inverter giới hạn tải chạy được.) Thời gian chuyển mạch backup nói khi 20 ms, khi 3 ms, khi 30 giây, mâu thuẫn.
- "Không bao giờ quá tải, inverter tự điều tiết" (buổi 4): nói quá.

## 7. Mức độ tin cậy

- Slide (230 trang, đọc hình): đáng tin hơn về công thức và bảng số liệu. Có vài trang mờ (p.24, p.69, p.109) cần kiểm lại.
- Video (phiên âm tự động): dùng để hiểu ý tưởng và kinh nghiệm thực tế. Không dùng số trong video nếu chưa đối chiếu slide.
- Các mâu thuẫn trong chính khóa học (6% và 3%, hệ số 6 và 8, K_TK 80% và 95%, thời gian chuyển mạch) cho thấy tài liệu là bản nháp cần giảng viên xác nhận.

## 8. Đọc lại toàn bộ (09/11/2026): slide, 4 file Excel, 7 buổi video phiên âm lại

Nguồn: whisper large-v3-turbo chạy tại máy cho cả 7 buổi; 21 phút cuối buổi 1 bị lặp chữ, đã phiên âm lại riêng.
Số trong video vẫn có thể sai; ưu tiên slide và Excel.

### 8.1 Sản lượng: engine khớp khóa học (bỏ nghi ngờ "ERA5 thấp ở miền Bắc")

Excel "Tinh San luong" cho sản lượng **chưa trừ tổn thất**; file "3.2 Phan tich" trừ thêm 10% DC/AC. Sau khi trừ:

| Tỉnh | Excel (thô) | Excel −10% | Engine (PVGIS, loss 14%) | Lệch |
|---|---|---|---|---|
| Hà Nội | 1.175 | 1.057 | 1.028 | −3% |
| TP.HCM | 1.518 | 1.366 | 1.358 | −1% |
| Bắc Giang / Hải Phòng / Thái Bình | 1.163 / 1.164 / 1.204 | 1.047 / 1.047 / 1.083 | 1.050 / 1.140 / 1.203 | 0 / +9 / +11% |
| Đồng Nai / Bình Dương / Tây Ninh | 1.574 / 1.562 / 1.597 | 1.416 / 1.406 / 1.437 | 1.330 / 1.350 / 1.373 | −6 / −4 / −4% |

Hệ quả: quy tắc nhanh của khóa học (3,2 h Bắc, 4 h Nam) là số **thô**, cao hơn thực nhận ~10%. Engine không cần nâng sản lượng.
Sheet Ninh Bình và Thái Nguyên trong Excel bị lỗi công thức (0,37 h/ngày) — không dùng.

### 8.2 Cách thầy định cỡ hệ hộ gia đình (buổi 1, 6)

- Sơ bộ: chỉ lấy kWh **từ bậc 4 trở lên** (bậc đắt), ÷30 ÷ giờ nắng. Excel "1. TINH kWh" làm đúng vậy.
- Hệ nhỏ nhất ~3 kW (inverter nhỏ nhất). TP.HCM: 3 × 4 × 30 = 360 kWh/tháng → hộ từ ~360 kWh (~1 triệu/tháng) "bắt đầu lắp được". Slide: Bắc > 300, Nam > 400.
- Chi tiết: hỏi **tỉ lệ dùng ban ngày** và khung giờ dùng (6–18 h hộ dân; 8–16 h xưởng). P_tb = kWh ban ngày ÷ số giờ.
  P_PV = P_tb ÷ 0,45 (Bắc, hướng kém) đến ÷ 0,65 (Nam, hướng tốt), +20% dự phòng, làm tròn lên cỡ tấm.
- Điện dư: E_dư ≈ 6·(P12h − P_tb)²/P12h (buổi 1 xác nhận); nên mua pin ≈ 80% E_dư. Không pin thì bỏ phần dư khỏi tiết kiệm và hoàn vốn.
- Lời khuyên: khách dùng nhiều điện ban ngày → lắp **vừa đủ theo tải trung bình**, lắp dư mà không có pin là phí.
- Tiết kiệm = 0,8 (hộ dân) hoặc 0,95 (tải đều) × (E_PV − E_dư) — hệ số 0,8 là "để giữ uy tín".
- Hộ nhỏ: theo cách chi tiết, hộ 300 kWh/70% ban ngày chỉ cần ~1,5 kWp — nhỏ hơn nhiều so với "hóa đơn ÷ giờ nắng" (~3 kWp).
  Thầy gợi ý micro-inverter 2–3 tấm cho tải nhỏ. **Liên quan trực tiếp Wave 3.**
- Lỗi số trong bài giảng: ví dụ HN 6 kWp ra E_dư "2 kWh" nhưng 8×(2,7−2,15) ≈ 4,4 kWh → tiết kiệm ~46%, không phải 53%.
  "1.318 kWh, 1.118 kWh từ bậc 4" sai số học (đúng là 1.018).

Engine mô phỏng theo giờ nên đã chứa các hiệu ứng trên; dùng công thức khóa học để **kiểm tra chéo**, không thay engine.

### 8.3 Pin, hybrid, dự phòng (buổi 1, 5, 6)

- Thầy không định giá dự phòng bằng tiền; ba mức: không dùng cổng backup / chỉ tải quan trọng / cả nhà qua ATS.
- Tải nên để trên backup: cửa cuốn, wifi, camera, phòng ngủ chính, máy tính, đèn hành lang; máy lạnh, máy giặt, lò vi sóng, bình nóng lạnh để phía lưới.
- Công suất backup dùng được = min(công suất EPS, giới hạn xả của pin/inverter, dòng bypass). Ví dụ Sungrow SH5K: backup 3 kW, sạc/xả 65 A × 48 V ≈ 3,1 kW.
- Khởi động: tủ lạnh 4–5×, máy lạnh thường 3×, bơm 6×, động cơ tới 7×; máy lạnh inverter ≈ định mức.
- Khách ngại pin to → bán pin nhỏ, mở rộng sau; nếu có khả năng thêm pin thì lắp **inverter hybrid ngay** (inverter hòa lưới không gắn pin được).
- Hybrid bám tải không bán điện: pin đầy thì tấm pin bị cắt bớt (ví dụ 35–38 → 20–24 kWh/ngày khi pin kém).
- Hybrid hoàn vốn "ít gì cũng 5 năm trở lên"; ví dụ 609 kWh của thầy: hóa đơn tháng đầu 800k (chậm đấu nối), sau đó 400–600k.

### 8.4 Việc engine có thể làm thêm

| # | Việc | Ảnh hưởng | Trạng thái |
|---|---|---|---|
| 1 | Giới hạn công suất sạc/xả pin theo kW mỗi giờ | Nhỏ với hộ dân (tải tối 1–2 kW); lớn với nhà hàng/khách sạn | **Đã làm** (engine 3.3.0, `batteryPowerKw`; trống = theo inverter) |
| 2 | Cắt đỉnh khi PV vượt công suất AC inverter (clipping) | Gói hiện tại: 0 kWh bị cắt (đỉnh giờ ≈13% sản lượng ngày < AC). Cần cho gói DC/AC 1,3–1,5 | **Đã làm** (`inverterAcKw`; phần cắt sạc vào pin hybrid trước khi mất) |
| 3 | Backup planner dùng min(EPS, công suất xả pin) thay vì kWp ÷ 1,15 | Gói 6K-16K: 5,1 kW → 6 kW; chữ cảnh báo nói rõ nguồn số | **Đã làm** (`backupOutputKw`) |
| 4 | Wave 3: gói ~1,5–3 kWp (hoặc micro-inverter) cho hộ 300–400 kWh | Mở thêm phân khúc; phải giữ hoàn vốn trung thực | Cao (đã có kế hoạch) |
| 5 | Mặc định không bán điện dư nếu chưa xác nhận công tơ hai chiều | Engine đã không cộng tiền điện dư vào hoàn vốn — khớp | Đã khớp |

Còn chờ dữ liệu: `batteryPowerKw` và `backupOutputKw` của SRNE HESP486S100-H / HESP4880SHD3 / HESP48120SH3 để trống vì chưa có datasheet chính thức. Khi có, nhập ở trang admin gói; engine tự dùng. Lưu ý mã "100" của HESP486S100-H nhiều khả năng là dòng sạc 100 A ≈ 4,8–5 kW ở 48 V — thấp hơn 6 kW AC — nên cần xác nhận trước khi hứa công suất dự phòng 6 kW.

### 8.5 Thông tin cũ hoặc sai cần tránh (bổ sung)

- Giá điện dư "~2.050 đ/kWh" (buổi 8) — sai; theo NĐ 58 là giá thị trường bình quân năm trước, thấp hơn nhiều.
- Viện dẫn NĐ 135/2024 (đã thay thế), không nói NĐ 243/2026; slide còn ghi bán dư tối đa 20%.
- Khung giờ cao điểm 9h30–11h30 & 17–20h và "tiết kiệm 3.200 đ/kWh ban ngày" cho khách kinh doanh — cần đối chiếu khung giờ hiện hành trước khi dùng.
- Đổi tiền ra kWh bằng giá phẳng 3.200–3.300 đ/kWh — sai cho hộ nhỏ (giá bình quân thấp hơn). Engine dùng biểu bậc thang — đúng.
- "Buổi trưa chỉ 45–65% công suất đỉnh" là thấp so với thực tế VN (thường 75–85% ngày nắng); dùng được cho P_tb trung bình năm, không dùng để chọn DC/AC 1,5–2.
- CB "càng to càng tốt"; "inverter không bao giờ vượt dòng"; cáp "mm² = kW"; nhiều chuỗi chung MPPT không nói cầu chì; hiệu suất inverter "93%" (nay 97–98,8%).
- Hợp đồng thuê/PPA "rẻ hơn điện lực 15–30%" — tính pháp lý bán điện cho bên thứ ba cần kiểm tra.

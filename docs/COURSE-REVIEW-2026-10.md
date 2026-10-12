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
- Đứng hoặc đi trên tấm pin, xếp quá nhiều tấm, kéo tay qua mép gạch (buổi 7).
- Dùng vít sắt cho xà gồ gỗ (buổi 7 nói đúng ngược lại, phải dùng vít gỗ cho xà gồ gỗ).
- Ví dụ pin 15 kWh xả 5 kW "3 giờ": nhầm kW với kWh. Thời gian chuyển mạch backup nói khi 20 ms, khi 3 ms, khi 30 giây, mâu thuẫn.
- "Không bao giờ quá tải, inverter tự điều tiết" (buổi 4): nói quá.

## 7. Mức độ tin cậy

- Slide (230 trang, đọc hình): đáng tin hơn về công thức và bảng số liệu. Có vài trang mờ (p.24, p.69, p.109) cần kiểm lại.
- Video (phiên âm tự động): dùng để hiểu ý tưởng và kinh nghiệm thực tế. Không dùng số trong video nếu chưa đối chiếu slide.
- Các mâu thuẫn trong chính khóa học (6% và 3%, hệ số 6 và 8, K_TK 80% và 95%, thời gian chuyển mạch) cho thấy tài liệu là bản nháp cần giảng viên xác nhận.

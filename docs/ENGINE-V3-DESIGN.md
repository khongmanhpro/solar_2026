# Engine v3 — Mô phỏng theo giờ, pin thực tế, tài chính vòng đời

> Trạng thái: thiết kế đã chốt để triển khai (11/10/2026). Mọi hằng số mới là
> **giả định DRAFT** ghi trong `CALCULATION_CONSTANTS` nên được chụp vào snapshot
> và fingerprint thuật toán; kỹ sư cần duyệt trước khi phát hành chính thức.

## 1. Vấn đề của engine v2 (đã kiểm chứng bằng ca thật)

| Vấn đề | Ví dụ | Hệ quả với khách |
|---|---|---|
| Pin giả định xả đầy 100% mỗi ngày, ngày nào cũng nắng | Nhà 450 kWh, pin 16 kWh → hóa đơn còn **0đ** | Con số "quảng cáo", mất niềm tin khi khảo sát |
| Lấy trung bình 12 tháng | Miền Bắc tháng 1–2 chỉ ~55% tháng 7 | Khách thấy hóa đơn mùa đông cao hơn hứa hẹn |
| Tự dùng = min(sản lượng, tỷ lệ ban ngày × tiêu thụ) | Không phân biệt giờ phát (đỉnh 11–12h) với giờ dùng | Tự dùng bị thổi phồng với hệ quá lớn |
| Xếp hạng thưởng sản lượng gần "nhu cầu ban ngày" | Gói 670 kWh/tháng cho nhà 450 kWh vẫn đứng đầu | Bán hệ quá cỡ, điện dư bỏ phí |
| Dòng tiền tuyến tính | Không suy giảm tấm, không tăng giá điện, không bảo trì, không thay pin/inverter | Hoàn vốn hybrid quá lạc quan, gói hòa lưới bị thiệt khi so |

## 2. Ma trận trường hợp phải đúng

| Trục | Các trường hợp |
|---|---|
| Vùng | Bắc (mùa rõ), Trung, Nam (đều); tỉnh có PVGIS 12 tháng; tỉnh chỉ có hệ số (fallback) |
| Mức dùng | 0 kWh (biên dưới khi hóa đơn "không rõ"), 150, 300, 450, 800, 1.500 kWh/tháng |
| Thói quen ban ngày | Ít ở nhà / có dùng một phần / thường ở nhà |
| Dự phòng | Không cần; cần + biết tải và giờ; cần + chưa biết tải; tải × giờ vượt dung lượng pin |
| Pha | 1 pha, 3 pha, chưa chọn (null) |
| Mái | Biết (đủ / không đủ cho mọi gói), chưa biết |
| Đầu vào | kWh, tổng tiền (chuẩn / biết thành phần / không rõ → tính tại 3 điểm) |
| Settings biên | hiệu suất pin 0, hệ số chu kỳ 0, tuổi thọ 1–50 năm, bảo trì 0 |
| Snapshot cũ | `resultJson` thiếu trường mới — UI/admin không được vỡ |

Bất biến cho mọi ca: không NaN/âm; bảo toàn năng lượng (tự dùng trực tiếp + pin + lưới = tiêu thụ; trực tiếp + sạc pin + dư = sản lượng); hóa đơn sau ≤ hóa đơn trước; cùng input + phiên bản → cùng kết quả.

## 3. Thiết kế đã chọn

### 3.1 Năng lượng: ngày điển hình theo giờ × 12 tháng × 3 loại ngày

- **Sản lượng giờ** = sản lượng ngày của tháng × hồ sơ phát 24h chuẩn hóa. Hồ sơ lấy từ Excel khóa học (14 tỉnh Bắc Bộ/ĐNB gần như trùng dạng; dùng trung bình Hà Nội–TP.HCM, đỉnh ~13%/giờ lúc 11–12h, nắng 6h–17h).
- **Biến động thời tiết**: mỗi tháng mô phỏng 3 loại ngày — nắng (1,3×), trung bình (1,0×), âm u (0,4×) với trọng số 0,4/0,4/0,2 (bình quân đúng 1,0×). Đây là thay đổi then chốt để pin không còn "đầy mỗi ngày": ngày âm u pin không sạc đủ → phải mua điện lưới.
- **Phụ tải giờ** theo tỷ lệ ban ngày đã có trong settings (`daytimeLow/Medium/HighRatio` = phần điện dùng 6h–18h): phần ban ngày rải đều 6h–18h; phần ban đêm dồn 60% vào 18h–22h (cao điểm tối), 40% rải 22h–6h. Admin vẫn chỉnh được tỷ lệ.
- **Mức dùng mỗi tháng** giữ bằng trung bình khách khai (chưa có dữ liệu mùa của khách; ghi rõ là giới hạn).
- **Fallback** tỉnh không có 12 tháng: dùng sản lượng tháng phẳng = `baseMonthlyGeneration × hệ số tỉnh`.

### 3.2 Pin (gói hybrid)

- Dung lượng khả dụng = danh định × **DoD 0,9** (LFP).
- Dự trữ dự phòng = tải thiết yếu × số giờ ÷ hiệu suất inverter 0,9, nếu khách khai; phần này không xả cho tự dùng hằng ngày. **Dự trữ > dung lượng khả dụng → gói không đạt** (không đề xuất gói không đáp ứng được dự phòng).
- Hiệu suất khứ hồi (`batteryRoundTripEfficiency`) áp khi sạc; lượng xả/ngày ≤ dung lượng khả dụng × `batteryDailyCycleFactor`.
- Mô phỏng ngày lặp 3 lần để trạng thái sạc đầu ngày hội tụ (pin mang điện từ chiều sang đêm và sáng hôm sau).
- Giới hạn công suất sạc/xả chưa áp (gói chưa lưu thông số inverter; ở quy mô hộ gia đình năng lượng mới là ràng buộc chính) — bổ sung ở Đợt 3 khi có bảng thiết bị.

### 3.3 Hóa đơn

- Mỗi tháng: tiền điện sau lắp = biểu giá bậc thang(điện lưới của tháng) × (1 + VAT). Tiết kiệm năm = Σ 12 tháng. Các trường cũ (`monthlySavingsVnd`, `billAfterSolarVnd`…) = bình quân tháng để tương thích; thêm `monthlyBreakdown[12]` (sản lượng, tự dùng, lưới, hóa đơn sau, tiết kiệm từng tháng) cho UI mùa vụ.
- Điện dư phát lưới định giá 0 (thận trọng; chưa có cơ chế mua điện dư hộ gia đình được duyệt).

### 3.4 Tài chính vòng đời (horizon = `systemLifetimeYears`)

| Giả định | Giá trị DRAFT | Nguồn |
|---|---|---|
| Suy giảm tấm | năm 1: 1%, sau đó 0,5%/năm | Datasheet Risen (năm đầu ≤1%, ~0,4–0,55%/năm); khóa học 0,6% |
| Tăng giá điện | 3%/năm | Excel `3.2 Phan tich` (bài giảng dùng 6% — chọn mức thận trọng) |
| Bảo trì | `maintenanceRatePerYear` × giá gói, tăng 3%/năm | Settings (khóa học 0,8% capex) |
| Thay inverter | năm 12, ~2,5 tr/kW (hòa lưới) / 3,3 tr/kW (hybrid) | Bảng giá SRNE 01/08/2026 (~3,3 tr/kW); Solplanet ước lượng |
| Thay pin | năm 12, ~2,0 tr/kWh | YUNQIDA 2,4 tr/kWh (01/08/2026), giả định giảm giá |
| Chiết khấu (NPV) | 8%/năm | Giả định |

Công suất inverter ước lượng = kWp ÷ 1,15 (gói chưa lưu kW inverter — thay bằng dữ liệu thật ở Đợt 3).

Đầu ra: dòng tiền lũy kế từng năm, **hoàn vốn nội suy từ dòng tiền thật**, tiết kiệm ròng 5/10/20 năm, NPV, IRR. Ba kịch bản thấp/chuẩn/cao chạy cùng mô hình với hệ số sản lượng của settings.

### 3.5 Xếp hạng

Điểm = 0,40 × kinh tế + 0,35 × mức giảm hóa đơn + 0,25 × tỷ lệ tự dùng.

- **Kinh tế**: 100 khi hoàn vốn ≤ 4 năm, giảm tuyến tính về 0 ở 12 năm; 0 nếu NPV < 0 hoặc không hoàn vốn.
- **Giảm hóa đơn**: % giảm tiền điện cả năm.
- **Tự dùng**: phạt hệ quá cỡ (điện dư bỏ phí).
- Bỏ "mục tiêu sản lượng = nhu cầu ban ngày × 0,8" — nguyên nhân chọn hệ quá lớn.

### 3.6 Quy tắc trung thực khi đề xuất (bổ sung sau khi chạy ma trận ca)

- **Chỉ đề xuất gói có lợi**: hoàn vốn ≤ 10 năm và NPV ≥ 0. Không gói nào đạt → không đề xuất, lý do `not_economical` (vd. nhà 150 kWh/tháng; khớp quy tắc khóa học: Nam < 400, Bắc < 300 kWh chưa đáng lắp).
- **Hiệu quả vốn**: nếu gói rẻ hơn đạt ≥ 95% NPV và hoàn vốn không chậm hơn gói đứng đầu → đề xuất gói rẻ hơn (vd. HCM 800 kWh hay ở nhà: hòa lưới 56 tr hoàn vốn 2,8 năm thay vì hybrid 110 tr cùng NPV).
- **Điện tự tiêu thụ inverter hybrid** 40 W liên tục được cộng vào phụ tải.
- **Lý do không có gói** trả về cho khách: `roof_too_small`, `phase_mismatch`, `backup_needs_battery`, `backup_exceeds_battery`, `not_economical`, `no_active_package`.
- Chi phí bảo trì mặc định 0,8% giá gói/năm (khóa học). **Settings đang chạy cần chỉnh trong `/admin/settings`** vì DB hiện lưu 0%.

### Kết quả ma trận ca (7 gói tham khảo, dữ liệu PVGIS hiện tại, settings DB lúc chạy: bảo trì 0%)

| Ca | Đề xuất | Tiết kiệm TB/tháng | Hóa đơn còn | Hoàn vốn |
|---|---|---|---|---|
| HCM 450 kWh, ở nhà một phần | Hybrid 6 kW + 16 kWh | 1,25 tr | 0,10 tr (−93%) | 6,7 năm |
| Hà Nội 450 kWh, ở nhà một phần | Hòa lưới 5 kW (hiệu quả vốn) | 0,69 tr (0,66–0,71 theo mùa) | 0,66 tr | 6,2 năm |
| HCM 800 kWh, hay ở nhà | Hòa lưới 5 kW (hiệu quả vốn) | 1,65 tr | 1,01 tr | 2,8 năm |
| Hà Nội 1.500 kWh, 3 pha | Hybrid 12 kW + 16 kWh | 3,46 tr (2,45–4,03) | 1,82 tr | 3,6 năm |
| HCM 150 kWh | Không đề xuất — chưa hiệu quả | — | — | — |
| Dự phòng 3 kW × 8 h | Không đề xuất — vượt pin 16 kWh | — | — | — |

### Phương án đã cân nhắc và loại

- *Mô phỏng 8.760 giờ với dữ liệu TMY*: chính xác nhất nhưng chưa có dữ liệu giờ theo tỉnh đã duyệt, nặng khi tính 7 gói × 3 kịch bản × 3 biên kWh. Thiết kế 12 × 3 × 24 cho ~95% lợi ích với dữ liệu hiện có.
- *Chỉ chỉnh hệ số pin (vd. 0,7)*: nhanh nhưng là "số ma thuật", không giải thích được với kỹ sư, không xử lý mùa và dự phòng.
- *Điểm theo NPV tuyệt đối*: thiên vị hệ lớn khi tiết kiệm biên còn dương; khách hộ gia đình nhạy với vốn ban đầu nên dùng hoàn vốn + mức giảm hóa đơn.

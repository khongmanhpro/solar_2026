# Bản phát hành đặc trưng — học từ công cụ hàng đầu thế giới

> Chốt 12/10/2026 sau nghiên cứu công cụ khách hàng (Google Solar, Tesla, EnergySage, Otovo, Enpal, SolarQuotes…),
> công cụ chuyên nghiệp (PVWatts/SAM, PVsyst, Aurora, OpenSolar) và thị trường Việt Nam (SolarBK, Vũ Phong, CoCo Solar…).
> Mục tiêu: minh bạch hơn, đúng luật hơn, dễ quyết định hơn mọi công cụ đang có ở Việt Nam.

## Quyết định kinh doanh

- Thanh toán hiển thị: **trả thẳng**, **trả góp 0% qua thẻ**, **vay ngân hàng** (khách tự chỉnh lãi suất/kỳ hạn).
- Cam kết công khai: **khảo sát miễn phí**, **gọi lại trong 2 giờ làm việc**. Không cam kết giá chốt.

## Tính năng, nguồn cảm hứng và trường hợp biên

| # | Tính năng | Học từ | Trường hợp phải đúng |
|---|---|---|---|
| 1 | Giải mã hóa đơn EVN theo bậc (trước/sau) | Tesla, 1KOMMA5° | Định mức nhiều hộ, kỳ ghi điện đổi ngày (dùng cùng `tariffBillingContext`); snapshot cũ không có version biểu giá → ẩn; biểu giá 5 bậc khi được kích hoạt |
| 2 | Biểu đồ 12 tháng (điện dùng từ mặt trời / pin / lưới; hóa đơn trước-sau) + bảng thay thế cho trình đọc màn hình | Aurora, SolarQuotes | Snapshot cũ thiếu `monthlyBreakdown` → ẩn; tỉnh fallback (tháng phẳng) vẫn hiển thị nhưng ghi chú "chưa có dữ liệu mùa" |
| 3 | "Chúng tôi tính thế nào" — nguồn dữ liệu, giả định, kịch bản thận trọng, nhãn chất lượng dữ liệu | EnergySage, Enphase, PVsyst | Dữ liệu DRAFT/DEMO phải nói thật "đang chờ kỹ sư duyệt"; không hiển thị số lẻ giả chính xác |
| 4 | Pin & mất điện: chọn thiết bị cần giữ → số giờ; giá trị thêm của pin so với hòa lưới | Tesla Backup Guide, Enphase | Gói không pin → gợi ý hybrid nếu có trong so sánh; tổng công suất thiết bị vượt inverter → cảnh báo; không chọn thiết bị → không chia 0 |
| 5 | So sánh thanh toán: trả thẳng / góp 0% thẻ (6–12 tháng, phí chuyển đổi tùy ngân hàng) / vay (lãi, kỳ hạn, trả trước) | Solar.com, Otovo, CoCo Solar | Lãi 0%; kỳ hạn biên; trả trước 100%; tiền góp > tiền tiết kiệm phải nói rõ "tháng âm" |
| 6 | Đúng luật 2026: bán điện dư ≤ 50% sản lượng (NĐ 58/2025 sửa đổi bởi NĐ 243/2026), giá ≈ giá thị trường bình quân năm trước; VAT 2027; checklist thủ tục | Nghiên cứu VN | Mặc định **không** cộng tiền bán dư vào hoàn vốn (chỉ 1,2% hộ chọn bán); giá bán dư là DRAFT; quy tắc VAT 10% từ 2027 để engine không lỗi sau 31/12/2026 |
| 7 | Link kết quả chia sẻ (không chứa thông tin cá nhân), in/PDF, chia sẻ qua Zalo (Web Share API) | Aurora, OpenSolar | Kết quả hết hạn lưu (chưa có lead) → trang báo hết hạn; ID không đoán được; không lộ lead |
| 8 | Nhu cầu tương lai: thêm máy lạnh, xe máy điện, ô tô điện, bình nóng lạnh | Enpal, 1KOMMA5° | Không lẫn với số đo của khách (provenance "dự kiến"); hóa đơn nền tính lại cho mức dùng tương lai; nhập tiền "không rõ" vẫn đúng khoảng |

## Hoãn lại

Bản đồ/vẽ mái (Google Maps API có phí), OCR hóa đơn, dữ liệu TMY theo giờ và hiệu chỉnh sai số ERA5 bằng Global Solar Atlas,
đề xuất cho đội lắp đặt (e-sign, đặt cọc). Các số liệu pháp lý cần xác minh trước khi phát hành chính thức: giá mua điện dư 2026,
VAT từ 2027, thời điểm áp dụng biểu giá 5 bậc.

# Kiểm thử khả dụng với người dùng mô phỏng — 12/10/2026

**Phương pháp:** trình duyệt Chrome thật, màn hình điện thoại 390×844. Năm vai khách hàng đi hết luồng, có cả những thao tác sai thường gặp ngoài đời. Mỗi lượt ghi lại ảnh chụp từng bước, số lần chạm, lỗi hiển thị, thời gian chờ kết quả, độ dài trang kết quả và số thuật ngữ khó hiểu.

> **Giới hạn:** đây là kiểm thử mô phỏng do máy chạy kịch bản, không thay được người thật. Vẫn cần 5–8 người dân thật dùng thử để đo mục tiêu Giai đoạn 1: tỷ lệ hoàn tất ≥ 85%, thời gian ≤ 60 giây.

## Các vai khách hàng

| Vai | Tình huống |
|---|---|
| Cô Lan, 58 tuổi, TP.HCM | Chỉ nhớ tiền điện "1.500.000" và gõ có dấu chấm; không biết nhà dùng 1 pha hay 3 pha; không biết diện tích mái |
| Anh Tuấn, 35 tuổi, Hà Nội | Có app EVN với 3 tháng kWh; mái 40 m²; cần giữ tủ lạnh, đèn, wifi 4 giờ; định mua xe máy điện |
| Bà Hoa, 67 tuổi, Đà Nẵng | Tiền điện khoảng 600.000đ; ban ngày ít ở nhà |
| Chú Hùng, Bình Dương | Nhà kiêm tiệm tạp hóa, điện 3 pha, 4.000.000đ; không chắc hóa đơn có khoản khác |
| Chị Mai, Cần Thơ | Tiền điện 2.000.000đ; nhà phố, mái chỉ 15 m² |

## Lỗi phát hiện và cách đã sửa

| Mức độ | Phát hiện (trước khi sửa) | Đã sửa |
|---|---|---|
| **Nghiêm trọng** | Gõ "1.500.000" theo thói quen người Việt bị hiểu thành **1,5 đồng**. Kết quả trả "khoảng 0 kWh" mà không báo lỗi gì | Ô tiền đổi sang ô chữ: tự bỏ dấu, tự hiện "1.500.000" khi gõ. Ô kWh và ô diện tích nhận dấu phẩy thập phân ("450,5"). Thêm cảnh báo khi số tiền dưới 30.000đ |
| **Nghiêm trọng** | 3/5 vai nhập tiền nhận câu "Các biên chưa dẫn tới cùng một gói…". Câu này khó hiểu và **sai lý do**: lý do thật là mái quá nhỏ hoặc chưa có lợi về kinh tế | Ưu tiên hiện lý do cụ thể. Câu "chưa chốt gói" viết lại bằng lời thường, chỉ dùng khi đúng là lý do đó |
| Cao | Màn kết quả đầu tiên không có giá, tiền tiết kiệm hay hoàn vốn. Chỉ thấy "Điểm phù hợp 80/100", "5.84 kWp", "443,7–517,7 kWh" | Thêm khung tóm tắt 4 ô bằng lời thường: chi phí lắp đặt / mỗi tháng bớt / tiền điện còn trả / hoàn vốn. Viết kiểu "110 triệu đồng", "~1,39 triệu đồng". Bỏ điểm nội bộ. Số thập phân dùng dấu phẩy kiểu Việt |
| Cao | Ô nhập đầu tiên nằm cách đỉnh **1.270 px** trên điện thoại (phải cuộn 1,5 màn hình mới thấy) | Thu gọn phần giới thiệu và ghi chú, ẩn tiêu đề lặp trên điện thoại. Lựa chọn đầu tiên giờ nằm ở **725 px**, lọt vào màn hình đầu |
| Cao | Tháng hóa đơn bắt buộc chọn bằng ô chọn tháng. Đây là ô khó nhất với người lớn tuổi và là lỗi đầu tiên cô Lan gặp | Tự điền tháng hóa đơn gần nhất; khách vẫn sửa được |
| Trung bình | Không có lựa chọn "không biết" cho câu 1 pha / 3 pha, người dân phải đoán | Thêm "Tôi không rõ", kèm lời giải thích. Hệ thống tạm tính theo 1 pha (phổ biến nhất) và ghi rõ để kỹ sư kiểm tra khi khảo sát |
| Trung bình | Bước 1 mô tả cách nhập tiền là "cần dữ liệu VAT, phụ phí chuẩn" (nghe đáng sợ); "Tải hóa đơn" hiện như dùng được nhưng thực ra chưa có | Đưa "Nhập tổng tiền điện — Dễ nhất" lên đầu; ghi "Tải hóa đơn (sắp có)" |
| Trung bình | Trang kết quả dài khoảng 14 màn hình; nút đăng ký nằm tận cuối | Thêm nút "Đăng ký khảo sát miễn phí" cố định ở cuối màn hình điện thoại |
| Thấp | Vùng bấm nhỏ hơn 44 px: "Xem bảng số liệu 12 tháng" cao 20 px, các ô lãi suất cao 30 px | Nâng lên ≥ 44 px. Ô lãi suất nhận "10,5" và chỉ chốt giá trị khi rời ô |
| Thấp | "Khoảng 0–1.866,8 kWh" khó hiểu | Đổi thành "tối đa khoảng 1.867 kWh"; làm tròn số kWh |

## Kết quả sau khi sửa

| Vai | Lỗi nhập | Số lần chạm | Chờ kết quả | Màn hình đầu của kết quả |
|---|---|---|---|---|
| Cô Lan | 0 (trước: 1 lỗi và kết quả sai) | 8 | ~3 giây | Gói đề xuất: 110 triệu, bớt ~1,39 triệu/tháng, hoàn vốn 6,1–6,2 năm |
| Anh Tuấn | 0 | 13 | 3–7 giây | Gói hybrid 6 kW + 16 kWh, kèm khung tóm tắt |
| Bà Hoa | 0 | 8 | ~2 giây | "Lắp điện mặt trời lúc này chưa có lợi về kinh tế" (trước: thông báo sai lý do) |
| Chú Hùng | 0 | 9 | ~2 giây | "Cần thêm thông tin", có các phương án tham khảo theo khoảng |
| Chị Mai | 0 | 8 | ~2 giây | "Diện tích mái chưa đủ cho các gói sẵn có" (trước: thông báo sai lý do) |

## Còn lại, đề xuất làm tiếp

1. **Tên gói còn kỹ thuật** ("Hybrid An tâm · 6 kW 1 pha + pin 16 kWh"). Nên đặt tên dễ hiểu trong trang quản trị, ví dụ "Gói có pin dự phòng — nhà 1,5–2 triệu/tháng".
2. **Phần chi tiết sau khung tóm tắt vẫn dài và nhiều thuật ngữ** ("kWh" xuất hiện khoảng 45 lần). Có thể gom các mục chuyên sâu (dòng tiền, so sánh, thiết bị, cách tính) vào "Xem phân tích chi tiết".
3. **Thử với người thật:** 5–8 người, trong đó ít nhất 3 người trên 55 tuổi. Đo tỷ lệ hoàn tất và thời gian.

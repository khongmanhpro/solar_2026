# Khung gói chuẩn và kiểm soát rủi ro

## Phạm vi

Gói chuẩn là phương án cố định để khách hàng tham khảo trên website. Đây
không phải báo giá chốt và không được dùng để cam kết sản lượng, thiết bị hoặc
giá trước khảo sát công trình.

## Những điểm rút ra từ báo giá mẫu 7,2 kWp / 6 kW / 16 kWh

- Tổng bằng số là `133.109.600 đồng`, trong khi phần chữ trên tài liệu ghi số
  khác. Hệ thống giữ tổng bằng số làm giá tham khảo và phát cảnh báo, không tự
  sửa theo suy đoán.
- Tài liệu ghi `VAT 8%` nhưng không xác định rõ các đơn giá dòng đã gồm VAT hay
  chưa. Hệ thống không tự cộng thêm hoặc tách VAT khi chưa có căn cứ.
- Một số subtotal không bằng tổng các dòng chi tiết do làm tròn: nhóm khung lệch
  800 đồng và nhóm vật tư điện lệch 536 đồng. Hệ thống giữ subtotal nguồn và
  báo cảnh báo đối soát.
- `31 m²` là diện tích mặt bằng phủ tấm trong báo giá mẫu. Gói chuẩn dùng diện
  tích mái khuyến nghị lớn hơn để dành khoảng hở, lối đi và vật cản.
- Tên model trong báo giá không đủ để kết luận tương thích điện. Pha, điện áp
  hở mạch, dòng làm việc, giới hạn MPPT, số string, giới hạn PV và sơ đồ tải
  backup đều phải được kỹ thuật xác nhận lại.

## Cấu trúc bắt buộc của một gói chuẩn

1. Nhận diện: mã gói, loại hệ thống, pha điện, công suất AC/DC.
2. Thiết bị: hãng/model, công suất tấm, số tấm, inverter, pin lưu trữ.
3. Mặt bằng: diện tích phủ tấm và diện tích mái khuyến nghị.
4. BOM: số lượng, đơn vị, đơn giá, thành tiền, phạm vi bắt buộc/tùy chọn.
5. Thương mại: giá tham khảo, trạng thái VAT, nguồn giá, hiệu lực, ghi chú.
6. Phạm vi: phần bao gồm, phần loại trừ và điều kiện phải khảo sát.
7. Kỹ thuật: các mục phải xác nhận trước khi phát hành báo giá chính thức.

## Cổng kiểm tra

### Lỗi chặn seed hoặc phát hành catalog

- Số tấm × công suất tấm không khớp công suất DC của gói.
- Dung lượng pin hoặc loại hệ thống không khớp.
- Diện tích mái nhỏ hơn diện tích phủ tấm.
- Tổng BOM đầy đủ không khớp giá tham khảo.
- Giá trong hồ sơ chuẩn không khớp giá hiển thị cho khách.

### Cảnh báo bắt buộc khảo sát/duyệt

- BOM chưa được itemize đầy đủ.
- VAT hoặc tổng tiền nguồn chưa rõ.
- Subtotal chi tiết lệch do làm tròn.
- Chưa xác nhận MPPT/string/điện áp/dòng điện.
- Chưa xác nhận pha điện, tải backup, bóng che, kết cấu mái và tuyến cáp.

## Quy tắc hiển thị cho khách

- Hiển thị tên gói, cấu hình chính, diện tích mái tham khảo và `Giá tham khảo
  từ`.
- Không gọi đây là báo giá chính thức.
- Luôn ghi rõ giá, sản lượng, thiết bị và phạm vi thi công được xác nhận sau
  khảo sát.
- Không tự động hứa hẹn pin 16 kWh sẽ cấp mọi tải trong 16 giờ; phải dựa vào
  công suất tải ưu tiên và thời lượng cần backup.


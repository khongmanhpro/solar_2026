# Tiến độ thiết kế 7 gói chuẩn

## Trạng thái: Pha 3 — Chờ dữ liệu kỹ thuật nguồn

## Tham chiếu

- [Rà soát kỹ thuật](RESEARCH.md)
- [Kế hoạch triển khai](IMPLEMENTATION.md)
- [Sổ chứng cứ nguồn](EVIDENCE-REGISTER.md)

## Đã hoàn thành trong Pha 1

- [x] Ghi nhận và băm kiểm tra ba tệp nguồn do chủ dự án cung cấp.
- [x] Đọc bảng giá đại lý SRNE hiệu lực 01/08/2026; ghi nhận điều kiện giá đã gồm VAT và khác giá gói mẫu.
- [x] Xác minh datasheet Solplanet cho ASW5000-S-G2, ASW6000-S-G2 và ASW8000-S.
- [x] Sửa model nội bộ của gói 8 kW một pha từ `ASW8000-S-G2` thành `ASW8000-S`.
- [x] Thêm trạng thái duyệt kỹ thuật và nguồn chứng cứ cho toàn bộ bảy gói.
- [x] Thêm cảnh báo tự động khi model inverter trong nguồn khác model catalog.
- [x] Hoàn thành Pha 1 với trạng thái `draft` cho toàn bộ gói và sổ nguồn có hash.

## Đã hoàn thành trong Pha 2

- [x] Bổ sung trường điện DC/AC, MPPT, string, pin và backup vào hồ sơ gói chuẩn.
- [x] Nạp thông số inverter từ datasheet Solplanet cho các gói hòa lưới 5/6/8 kW.
- [x] Bổ sung kiểm tra tự động cho tỷ lệ DC/AC, công suất PV tối đa, điện áp/dòng string, số string/MPPT và tải backup.
- [x] Gói `approved` bị chặn nếu thiếu datasheet nhà sản xuất hoặc dữ liệu kỹ thuật bắt buộc.
- [x] Thêm kiểm thử chặn Voc lạnh vượt giới hạn inverter khi gói ở trạng thái `approved`.
- [x] Cập nhật bảy bản ghi catalog cục bộ lên phiên bản `customer-reference-packages-v2-2026-08-04`.

## Quyết định

- Không gói nào được gắn `approved` trong Pha 1; tất cả vẫn là `draft`.
- Không thay mã Hybrid 6 kW từ báo giá mẫu bằng mã bảng giá đại lý vì chưa có datasheet xác nhận SKU giao thực tế.
- Dữ liệu giá đại lý chỉ làm bằng chứng tham chiếu, không tự ghi đè giá gói khách hàng.

## Phần còn thiếu

- Datasheet chính thức Risen 720/730 W, SRNE Hybrid và Yunqida 16 kWh.
- Bảng tương thích pin–inverter SRNE/Yunqida.
- Dữ liệu điện áp/dòng để tính string/MPPT và dữ liệu tải backup.
- Khảo sát layout mái, kết cấu, bóng che và đấu nối cho từng khách.

## Bước kế tiếp

Khi có datasheet còn thiếu, điền dữ liệu panel/SRNE/Yunqida, lập string plan
và backup plan cho từng gói. Khi đó validator có thể được dùng để duyệt từng
cấu hình thay vì chỉ cảnh báo dữ liệu thiếu.

## Kiểm tra đã chạy

- `npm run type-check`
- `npm run lint`
- `npm run test:run` — 17 bộ kiểm thử, 239 kiểm thử đều đạt.
- `npm run build`

## Tệp đã thay đổi trong Pha 1–2

- `src/types/standard-package.ts`
- `src/config/standard-package-catalog.ts`
- `src/config/customer-reference-packages.ts`
- `src/lib/standard-package-validation.ts`
- `prisma/seed.ts`
- `tests/standard-package-validation.test.ts`
- `tests/customer-reference-packages.test.ts`

# Quy trình thay dữ liệu demo bằng dữ liệu thật

## Mục tiêu

Không để một giá trị không rõ nguồn đi vào kết quả công khai. Mỗi package, biểu
giá, hệ số sản lượng và giả định phải có người chịu trách nhiệm xác nhận.

## Mẫu dữ liệu

Sử dụng file:

`docs/templates/Mau-thu-thap-du-lieu-dien-mat-troi.xlsx`

Ô màu vàng là dữ liệu nhà cung cấp nhập; ô xanh nhạt là công thức kiểm tra. Các
trường có dấu `*` là bắt buộc.

Các sheet chính:

| Sheet | Nội dung |
| --- | --- |
| `THONG_TIN_DN` | Pháp lý, hotline, Zalo và người phê duyệt |
| `GOI_SAN_PHAM` | Giá, công suất, cấu hình và bảo hành từng gói |
| `THIET_BI` | SKU, model, datasheet và chính sách bảo hành |
| `SAN_LUONG_KHU_VUC` | Sản lượng tháng, nguồn và tổn hao |
| `BIEU_GIA_DIEN` | Bậc giá, VAT, hiệu lực và văn bản nguồn |
| `GIA_DINH_TAI_CHINH` | Hiệu suất, suy giảm, O&M và thay thế |
| `QUY_TAC_DE_XUAT` | Điều kiện và trọng số chọn gói |
| `HOA_DON_MAU` | Hồ sơ phụ tải ẩn danh để hiệu chỉnh |
| `CA_NGHIEM_THU` | Kết quả đúng được kỹ sư phê duyệt |

## Cổng chất lượng dữ liệu

Đề xuất trạng thái cho mọi bản ghi:

- `DEMO`: dữ liệu mẫu hoặc chưa có bằng chứng nguồn.
- `DRAFT`: đang nhập hoặc chưa có nguồn.
- `VERIFIED`: đã đủ nguồn, người duyệt và ngày hiệu lực.
- `EXPIRED`: hết hiệu lực.
- `DISABLED`: không dùng cho calculation mới.

Chỉ `VERIFIED` được phép dùng ở chế độ production.

## Checklist trước khi nhập

- [ ] Giá package ghi rõ đã gồm VAT hay chưa.
- [ ] Phạm vi lắp đặt, vận chuyển và hạng mục loại trừ rõ ràng.
- [ ] Model thiết bị khớp datasheet.
- [ ] Sản lượng có nguồn, thời kỳ tham chiếu và tổn hao.
- [ ] Biểu giá có văn bản, ngày hiệu lực và VAT.
- [ ] Thông tin hotline/Zalo không còn giá trị mẫu.
- [ ] Trọng số đề xuất được kỹ sư và kinh doanh đồng ý.
- [ ] Có ít nhất 10 ca nghiệm thu độc lập.

## Ánh xạ vào hệ thống hiện tại

Các cột có tên biến trong ngoặc ở `GOI_SAN_PHAM` ánh xạ trực tiếp model
`SolarPackage`. Settings có tên biến tương ứng `CalculationSetting`.

Riêng biểu giá/VAT được nạp từ `data/electricity-tariffs.json` và kiểm tra
fail-fast khi build/runtime. Không sửa version cũ: mỗi thay đổi giá, ngày, nguồn,
VAT hoặc làm tròn phải tạo record/version mới. Candidate chưa có quyết định giá
phải để `effectivePeriod.from=null`, `selectable=false`. Quy trình chi tiết tại
[`PHASE-2-TARIFF-ENGINE.md`](./PHASE-2-TARIFF-ENGINE.md) và
[`data/README.md`](../data/README.md).

Trang `/admin` hiện chỉ phục vụ chỉnh dữ liệu vận hành cũ. Bản ghi tạo mới được
gắn `DEMO`; bất kỳ bản ghi nào bị sửa đều hạ xuống `DRAFT` và xóa phê duyệt. Vì
phần quản trị không nằm trong roadmap khách hàng, trang này **không thể tự nâng
dữ liệu lên `VERIFIED`**.

Việc phát hành dữ liệu thật phải đi qua thay đổi được review (import/migration
hoặc cấu hình versioned) và điền đủ `dataVersion`, `sourceReference`,
`dataOwner`, `effectiveFrom`, `approvedBy`, `approvedAt`. Manifest còn phải lưu
SHA-256 của đúng nội dung đã duyệt. Đường kiểm định Excel ứng viên đã có qua
`data:validate`, `data:preview` và `data:build-candidate`. Ba lệnh này chỉ tạo
bundle JSON có hash, chưa ghi database. `data:import-draft` chỉ được phép đi
tiếp khi toàn bộ gói đủ trường của engine; lệnh tự chặn nhập một phần, yêu cầu
cờ xác nhận, từ chối ghi đè mã hiện có, rồi mới backup và mở transaction.

Workbook thị trường ngày 29/07/2026 hiện chỉ đủ làm candidate: có cấu hình thiết
bị và một phần báo giá nhà cung cấp, nhưng giá gói vẫn là ước lượng, VAT/BOM/
sản lượng vùng/phê duyệt còn thiếu. Không được đổi nhãn candidate này thành dữ
liệu production chỉ vì parse thành công.

## Xác minh sau nhập

1. Chạy lại toàn bộ test kỹ thuật.
2. Tính các ca trong `CA_NGHIEM_THU`.
3. So sánh package, sản lượng, tiết kiệm và hoàn vốn.
4. Yêu cầu kỹ sư ký xác nhận kết quả.
5. Đối chiếu content hash với manifest và chạy test cổng production.
6. Chụp snapshot phiên bản dữ liệu và thuật toán.
7. Chỉ sau đó mới bật dữ liệu cho khách hàng.

## Dữ liệu khách hàng

Hóa đơn mẫu phải được ẩn danh. Không đưa tên, địa chỉ chi tiết, mã khách hàng,
số điện thoại hoặc ảnh hóa đơn chưa che thông tin vào repository.

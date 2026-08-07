# Mẫu thu thập dữ liệu

## Dùng file nào

| File | Trạng thái | Dùng khi nào |
|---|---|---|
| `Phieu-thu-thap-du-lieu-R1.xlsx` | **ĐANG DÙNG** | Bản phát hành đầu tiên (R1). Đây là file gửi cho chủ sở hữu điền. |
| `Mau-thu-thap-du-lieu-dien-mat-troi.xlsx` | Đã thay thế | Chỉ giữ để tham chiếu lịch sử. Không dùng làm hợp đồng dữ liệu. |

## Vì sao mẫu cũ bị thay thế

Mẫu cũ được lập trước khi rà soát lại mô hình tính toán. Có ba chỗ sai lệch so với hệ thống hiện tại:

1. Sheet `BIEU_GIA_DIEN` ghi cấu trúc **5 bậc** (0–100, 100–200, 200–400), trong khi biểu giá đang áp dụng theo Quyết định 1279/QĐ-BCT là **6 bậc** (0–50, 50–100, 100–200, 200–300, 300–400, trên 400). Registry đúng nằm ở `data/electricity-tariffs.json` — không cần nhà cung cấp điền lại.
2. Sheet `GOI_SAN_PHAM` có cột *Sản lượng nền kWh/tháng*. Cột này trộn dữ liệu sản phẩm với dữ liệu vùng miền và sẽ bị bỏ. Xem NV1 trong [CODEX-WORK-ORDER-R1.md](../CODEX-WORK-ORDER-R1.md).
3. Danh sách tỉnh theo **63 đơn vị cũ**. Từ 01/7/2025 cả nước còn **34 đơn vị** theo Nghị quyết 202/2025/QH15 và Quyết định 19/2025/QĐ-TTg.

## Cấu trúc phiếu R1

| Sheet | Ai điền | Nội dung |
|---|---|---|
| `00_HUONG_DAN` | — | Hướng dẫn và bảng theo dõi tiến độ tự động |
| `01_CAU_HOI_CHINH` | Chủ sở hữu | 39 câu quyết định kinh doanh, phân loại P0/P1/P2 |
| `02_GOI_SAN_PHAM` | Kinh doanh | Gói đang bán |
| `03_THIET_BI` | Kỹ thuật/nhà cung cấp | Thông số theo datasheet |
| `04_VUNG_PHUC_VU` | Kinh doanh | 34 tỉnh, chọn mức phục vụ |
| `05_HOA_DON_MAU` | Chủ sở hữu | Hóa đơn EVN đã ẩn danh |
| `06_VIEC_KY_SU` | Kỹ sư | Danh sách việc cần chuyên môn, không phải việc chủ sở hữu |
| `07_KHONG_CAN_DIEN` | — | Những trường đã lỗi thời, đọc để không mất công |
| `08_DANH_MUC` | — | Danh sách giá trị cho ô dropdown |

## Quy ước màu

- Ô **vàng**: người điền nhập vào.
- Ô **xám**: dữ liệu có sẵn, không sửa.
- Cột *Ưu tiên*: đỏ nhạt `P0` là bắt buộc, vàng `P1` cần trước khi mở cho khách, xanh `P2` có thì tốt.

## Nguyên tắc quan trọng

Không biết một giá trị thì ghi `chưa biết`, **không đoán**. Hệ thống được thiết kế để nới rộng khoảng ước tính và hạ nhãn tin cậy khi thiếu thông tin. Một con số đoán bừa sau khi vào hệ thống sẽ mang nhãn "đã xác minh" và không còn ai cảnh báo nữa — rủi ro lớn hơn việc để trống.

Không đưa dữ liệu khách hàng có thể nhận dạng (tên, số điện thoại, địa chỉ chi tiết, mã khách hàng EVN, ảnh hóa đơn chưa che) vào bất kỳ sheet nào.

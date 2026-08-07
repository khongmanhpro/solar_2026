# Sổ chứng cứ nguồn cho 7 gói chuẩn

## Quy tắc sử dụng

Mỗi nguồn dưới đây là bằng chứng truy xuất, không tự động biến gói thành gói
đã duyệt kỹ thuật. Datasheet panel, inverter, pin và bảng tương thích phải
khớp model/SKU sẽ giao thực tế. Khi nguồn thay đổi, cập nhật ngày hiệu lực và
hash trước khi phát hành lại catalog.

## Nguồn đã ghi nhận

| ID | Nguồn | Hiệu lực/phiên bản | Phạm vi tin cậy | Hash SHA-256 |
| --- | --- | --- | --- | --- |
| `FORMULA-V1-2026-08-04` | `bo-cong-thuc-tao-goi-dien-mat-troi-v1.md` | V1, 04/08/2026 | Công thức demo, định mức và rủi ro đã biết; không dùng chốt hợp đồng. | `b70cab3f7cdd475848df2763a9d1e6532e72ee245748984021a9612c7820f4e8` |
| `SOLARPEAK-QUOTE-2026-07-30` | `BG 7,2kWp - 6kW 1P - 16kWh.pdf` | 30/07–09/08/2026 | Baseline 7,2 kWp / 6 kW / 16 kWh, BOM và giá nguồn. | `5b0922292604b36459c56268ed63964dfc734ff4d9f49b151bb9505e8e192ecf` |
| `SRNE-DEALER-PRICE-LIST-2026-08-01` | `Quote_SRNE_DaiLy(01Aug26).pdf` | Từ 01/08/2026 đến khi có thông báo mới | Mã và giá inverter đại lý; giá đã gồm VAT, giao tại kho Q.7. Không thay thế datasheet. | `0cb6dffed97041f7b39f4a52e3b32673df84f2b45a1305357feedd029f6fd0b1` |
| `SOLPLANET-ASW-3-6K-S-G2-2022-07` | [Datasheet ASW 3–6 kW S G2](https://solplanet.net/wp-content/uploads/2022/09/Datasheet-ASW-3K-6K-S-G2-Series-0722_Global-EN_web.pdf) | 07/2022 | Xác nhận ASW5000-S-G2 và ASW6000-S-G2, 2 MPPT, 1 string/MPPT, 600 V DC. | Nguồn web chính thức |
| `SOLPLANET-ASW-6-10K-S-2024-09` | [Datasheet ASW 6–10 kW S](https://solplanet.net/wp-content/uploads/2021/11/Fiche-Technique-ASW-S-6-10kW-FR.pdf) | 09/2024 | Xác nhận ASW8000-S, không phải ASW8000-S-G2; 3 MPPT, 1 string/MPPT, 600 V DC. | Nguồn web chính thức |

## Đối soát đã phát hiện

| Hạng mục | Báo giá SolarPeak | Bảng giá đại lý SRNE | Xử lý trong dự án |
| --- | --- | --- | --- |
| Model Hybrid 6 kW 1 pha | `HESP486S100-H` | `HESP4860S100-H` | Giữ model catalog theo báo giá mẫu, gắn cảnh báo `SOURCE_INVERTER_MODEL_MISMATCH`; không tự đổi SKU. |
| Giá inverter Hybrid 6 kW 1 pha | 20.520.000 đồng trong báo giá trọn gói | 20.110.000 đồng (1–2 chiếc, đã gồm VAT) | Không thay giá gói mẫu bằng bảng giá đại lý; giá có thời hạn và điều kiện khác nhau. |
| Model 8 kW 1 pha Solplanet | `ASW8000-S-G2` trong catalog cũ | Datasheet hãng nêu `ASW8000-S` | Đã sửa model catalog thành `ASW8000-S`; trạng thái kỹ thuật vẫn là `draft`. |

## Trạng thái mỗi gói

| Mã gói | Trạng thái | Còn thiếu để duyệt |
| --- | --- | --- |
| `HOME-GT-1P-5K` | `draft` | Datasheet panel, string/MPPT theo panel, layout mái và kiểm tra đấu nối. |
| `HOME-GT-1P-6K` | `draft` | Datasheet panel, string/MPPT theo panel, layout mái và kiểm tra đấu nối. |
| `HOME-GT-1P-8K` | `draft` | Datasheet panel, string/MPPT theo panel, layout mái và kiểm tra dòng AC 40 A. |
| `HOME-HY-1P-6K-16K` | `draft` | Datasheet SRNE/Yunqida, xác nhận SKU, bảng tương thích pin và tải backup. |
| `HOME-HY-1P-7K2-16K` | `draft` | Datasheet SRNE/Yunqida, xác nhận SKU, string plan và tải backup. |
| `HOME-HY-3P-8K-16K` | `draft` | Datasheet SRNE/Yunqida, string plan, pin tương thích và sơ đồ backup ba pha. |
| `HOME-HY-3P-12K-16K` | `draft` | Datasheet SRNE/Yunqida, string plan, pin tương thích và sơ đồ backup ba pha. |

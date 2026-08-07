# Rà soát kỹ thuật danh mục 7 gói điện mặt trời

## Mục tiêu

Xây dựng bảy gói tham khảo cho hộ gia đình để khách dễ so sánh. Mỗi gói
phải có cấu hình thiết bị, giới hạn kỹ thuật, diện tích mái, phạm vi thi công
và giá tham khảo rõ ràng. Đây không phải báo giá chốt: cấu hình cuối cùng chỉ
được duyệt sau khảo sát công trình.

## Kết luận hiện trạng

Dự án đã có bảy gói hiển thị cho khách và có cơ chế kiểm tra sự nhất quán
giữa công suất DC, số tấm, dung lượng pin, diện tích mái, BOM và giá. Khung
này phù hợp để làm điểm xuất phát, nhưng sáu gói ngoài báo giá mẫu chưa có đủ
chứng cứ để gắn trạng thái `đã duyệt kỹ thuật`.

Không được suy ra sự tương thích điện chỉ từ công suất kWp/kW hoặc tên model.
Mỗi cấu hình cần datasheet đúng phiên bản đang bán, phương án string/MPPT,
kiểm tra điện áp ở nhiệt độ biên, dòng vào, pha điện, tải backup và kết cấu
mái.

## Danh mục hiện có và trạng thái thiết kế

| Mã | Mục đích cho khách | Cấu hình đang hiển thị | DC/AC hiện tại | Trạng thái trước khi duyệt |
| --- | --- | --- | ---: | --- |
| `HOME-GT-1P-5K` | Giảm tiền điện ban ngày | 5,84 kWp / 5 kW / 1 pha | 1,168 | Giữ làm ứng viên; cần datasheet panel, inverter và sơ đồ string. |
| `HOME-GT-1P-6K` | Hộ gia đình dùng điện ban ngày cao hơn | 6,57 kWp / 6 kW / 1 pha | 1,095 | Cần tăng DC, đổi tấm hoặc lập ngoại lệ có duyệt; ngưỡng V1 là từ 1,10. |
| `HOME-GT-1P-8K` | Hộ có phụ tải ban ngày cao | 8,76 kWp / 8 kW / 1 pha | 1,095 | Model đã hiệu chỉnh thành `ASW8000-S` theo datasheet Solplanet 6–10 kW; vẫn ở trạng thái dự thảo vì chưa có datasheet panel, layout/string và điều kiện công trình. |
| `HOME-HY-1P-6K-16K` | Dự phòng tải ưu tiên | 5,84 kWp / 6 kW / 16,07 kWh / 1 pha | 0,973 | Cần thiết kế lại DC array và kiểm tra công suất xả pin/tải backup. |
| `HOME-HY-1P-7K2-16K` | Phương án tham chiếu theo báo giá mẫu | 7,2 kWp / 6 kW / 16 kWh / 1 pha | 1,200 | Là baseline thương mại tốt nhất; vẫn cần datasheet đúng model và sơ đồ string/backup. |
| `HOME-HY-3P-8K-16K` | Nhà lớn, tải ưu tiên 3 pha | 8,76 kWp / 8 kW / 16,07 kWh / 3 pha | 1,095 | Cần tăng DC, đổi tấm hoặc lập ngoại lệ có duyệt; xác nhận backup ba pha. |
| `HOME-HY-3P-12K-16K` | Nhà lớn/hộ kinh doanh tại gia | 11,68 kWp / 12 kW / 16,07 kWh / 3 pha | 0,973 | Cần thiết kế lại DC array; dung lượng pin phải gắn với tải ưu tiên thay vì ngầm hứa hẹn backup toàn bộ nhà. |

Tỷ lệ DC/AC từ 1,10 đến 1,30 là ngưỡng sàng lọc trong công thức V1, không
thay thế giới hạn PV, MPPT, điện áp hoặc dòng điện trong datasheet của inverter.
Gói chỉ được phép nằm ngoài ngưỡng này khi có lý do kỹ thuật và người duyệt
ghi nhận rõ ràng.

## Bài học từ báo giá mẫu 7,2 kWp / 6 kW / 16 kWh

- Tổng bằng số là 133.109.600 đồng nhưng phần chữ ghi số khác; không tự sửa
  bằng suy đoán.
- Thuế suất 8% xuất hiện trong tài liệu nhưng cơ sở giá đã gồm/chưa gồm VAT
  chưa rõ; không tự cộng hoặc tách VAT.
- Subtotal khung và vật tư điện lệch chi tiết lần lượt 800 đồng và 536 đồng;
  giữ subtotal nguồn, đồng thời gắn cảnh báo đối soát.
- 31 m² là diện tích phủ tấm, không phải diện tích mái cần có. Cấu hình mẫu
  cần khoảng 35,7 m² khi dành 15% cho khoảng hở, lối đi và vật cản.

## Dữ liệu bắt buộc cho một gói có thể duyệt

### Thiết bị và điện DC

- Panel: hãng, model/SKU, datasheet và ngày hiệu lực; Pmax, Voc, Vmp, Isc,
  Imp, hệ số nhiệt Voc/Vmp, kích thước và điện áp hệ thống tối đa.
- Inverter: hãng, model/SKU, pha, công suất AC, điện áp/dòng AC danh định,
  công suất PV tối đa, điện áp DC tối đa, điện áp khởi động, dải MPPT, số
  MPPT, số string/MPPT, dòng tối đa từng MPPT và tài liệu bảo hành.
- Cấu hình string: số tấm trên từng string, MPPT gắn với string nào, Voc lạnh,
  Vmp nóng, dòng vào từng MPPT và kết quả pass/fail.

### Hybrid và backup

- Pin: model, năng lượng danh định và dùng được, DoD, điện áp, công suất sạc/xả
  liên tục/đỉnh, hiệu suất, số module tối thiểu/tối đa và bảng tương thích với
  inverter.
- Danh sách tải backup, công suất đồng thời, dòng khởi động và số giờ yêu cầu.
  Thời gian dự phòng phải được tính từ năng lượng dùng được, không dùng dung
  lượng danh định để cam kết.
- Sơ đồ tủ backup/ATS/EPS, phân pha và quy tắc tải không được backup.

### Công trình, BOS và sản lượng

- Bản vẽ layout (hàng/cột/hướng đặt), diện tích mái khả dụng, bóng che, hướng,
  độ nghiêng, loại/kết cấu mái, tải trọng và tuyến cáp.
- BOM theo layout: khung, kẹp, rail, cáp DC/AC/PE, đầu nối, CB, SPD, tủ điện,
  tiếp địa, công lắp, vận chuyển và công việc phát sinh.
- PVout theo tỉnh/tháng thay cho hệ số cố định 120 kWh/kWp/tháng; áp dụng hệ số
  tổn hao và nêu rõ giả định sản lượng.

## Mô hình dữ liệu cần bổ sung

`StandardPackageDefinition` hiện lưu cấu hình thương mại cơ bản, nhưng cần mở
rộng thành hồ sơ kỹ thuật có thể kiểm tra được:

```text
technicalStatus: draft | approved | suspended
approval: { engineer, approvedAt, datasheetVersion, sourceUrls }
panelElectrical: { voc, vmp, isc, imp, tempCoefficients, maxSystemVoltage }
inverterElectrical: { phase, maxPvKw, maxDcVoltage, mpptRange, mpptCount,
  stringsPerMppt, maxInputCurrentPerMppt, nominalAcVoltage, maxAcCurrent }
batteryElectrical: { usableKwh, maxChargeKw, maxDischargeKw, dod,
  compatibleInverterModels }
stringPlan: { strings, mpptAssignments, minAmbientC, maxCellC,
  vocCold, vmpHot, inputCurrent, validated }
backupPlan: { protectedLoadsKw, surgeKw, targetHours, estimatedHours,
  phases, epsOrAts }
roofPlan: { panelCoverageM2, requiredRoofM2, layoutFactor, roofTypes,
  structuralReviewRequired }
releaseEvidence: { bomVersion, priceEffectiveFrom, vatBasis, sourceDocuments }
```

Trạng thái kỹ thuật chỉ dùng nội bộ. Khi hiển thị cho khách, vẫn dùng ngôn ngữ
"Giá tham khảo từ" và "Xác nhận sau khảo sát", không hiển thị thuật ngữ thử
nghiệm hay mã cảnh báo nội bộ.

## Cổng phát hành bắt buộc

Một gói không được đặt `approved` nếu thiếu bất kỳ mục nào dưới đây:

1. Datasheet đúng model và phiên bản đang bán; nguồn được lưu cùng ngày hiệu lực.
2. Công suất DC tính từ tấm, giới hạn PV inverter, Voc lạnh, Vmp nóng, dòng
   MPPT và số string đều đạt.
3. Pha điện, dòng AC, tủ điện và khả năng đấu nối được kỹ thuật xác nhận.
4. Với hybrid, công suất xả pin/inverter chịu được tải backup và thời gian
   backup được tính từ tải ưu tiên.
5. Layout, diện tích mái, bóng che, kết cấu và tuyến cáp đạt khảo sát.
6. BOM đủ dòng; giá, VAT, hiệu lực và phạm vi bao gồm/loại trừ có người duyệt.

## Nguồn tham chiếu

- [EVN: Công bố hệ số PVout năm 2026](https://www.evn.com.vn/d/vi-VN/news/-Cong-bo-He-so-PVout-nam-2026-phuc-vu-tinh-toan-san-luong-dien-mat-troi-mai-nha-tu-san-xuat-tu-tieu-thu-60-2026-506570) — kế hoạch thay hệ số sản lượng cố định bằng dữ liệu PVout theo địa phương.
- [Solplanet: dòng ASW 3–6 kW S G2](https://solplanet.net/au/products/asw-6-10k-s-series) — dùng để đối chiếu lại model inverter 1 pha trước khi duyệt.
- [QCVN 26:2025/BCT](https://www.evn.com.vn/userfile/User/minhhanh/files/2025/12/QCVN-26-2025-20251201152537687_BCT%20Ky%20thuat%20dien%20-%20He%20thong%20luoi%20dien.pdf) — kiểm tra các hạng mục nối đất và phần kim loại phải nối đất trong phạm vi áp dụng.

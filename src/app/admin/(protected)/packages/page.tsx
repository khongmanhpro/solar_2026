import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PackagesManager } from "@/components/admin/PackagesManager";
import { services } from "@/server/container";

export const metadata = { title: "Quản lý gói | Solar Admin" };

export default async function AdminPackagesPage() {
  const packages = await services.packages.list();

  return (
    <>
      <AdminPageHeader
        description="Điều chỉnh giá, công suất, sản lượng, diện tích mái, thiết bị và thứ tự đề xuất. Tắt gói thay cho xóa để bảo toàn calculation cũ."
        eyebrow="Trạm điều khiển / Packages"
        title="Gói hệ thống"
      />
      <PackagesManager initialPackages={packages} />
    </>
  );
}

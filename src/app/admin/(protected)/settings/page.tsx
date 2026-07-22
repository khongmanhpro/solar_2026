import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { services } from "@/server/container";

export const metadata = { title: "Cấu hình | Solar Admin" };

export default async function AdminSettingsPage() {
  const [settings, provinces] = await Promise.all([
    services.settings.get(),
    services.provinces.list(),
  ]);

  return (
    <>
      <AdminPageHeader
        description="Quản lý giả định toàn cục và hệ số khu vực. Validation phía client và server cùng dùng một schema để tránh cấu hình lệch."
        eyebrow="Trạm điều khiển / Settings"
        title="Công thức & khu vực"
      />
      <SettingsManager initialProvinces={provinces} initialSettings={settings} />
    </>
  );
}

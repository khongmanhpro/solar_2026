import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadsManager, type AdminLeadListItem } from "@/components/admin/LeadsManager";
import { services } from "@/server/container";

export const metadata = { title: "Khách hàng tiềm năng | Solar Admin" };

export default async function AdminLeadsPage() {
  const leads = await services.leads.list();
  const serializableLeads: AdminLeadListItem[] = leads.map((lead) => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    calculation: {
      ...lead.calculation,
      createdAt: lead.calculation.createdAt.toISOString(),
    },
  }));

  return (
    <>
      <AdminPageHeader
        description="Theo dõi yêu cầu khảo sát, xem lại snapshot calculation đã tạo ra lead và cập nhật tiến độ từ liên hệ đến kết quả cuối."
        eyebrow="Trạm điều khiển / Leads"
        title="Khách hàng tiềm năng"
      />
      <LeadsManager initialLeads={serializableLeads} />
    </>
  );
}

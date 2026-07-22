import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/server/admin-auth";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdminPage();

  return (
    <div className="admin-shell min-h-screen">
      <aside className="admin-sidebar">
        <div>
          <Link className="inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sun)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)]" href="/admin">
            <span className="sun-mark" aria-hidden="true" />
            <span className="font-display text-xl font-semibold text-[var(--paper)]">
              Solar Ops
            </span>
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--line-strong)]">
            Busbar điều hành
          </p>
        </div>
        <div className="admin-busbar" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-[var(--admin-rail)] pt-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--line-strong)]">
            Phiên đang hoạt động
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-[var(--paper)]">
            {session.username}
          </p>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[88rem]">{children}</div>
      </main>
    </div>
  );
}

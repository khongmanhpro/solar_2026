import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getOptionalAdminPageSession } from "@/server/admin-auth";

export const metadata = { title: "Đăng nhập quản trị | Solar" };

export default async function AdminLoginPage() {
  if (await getOptionalAdminPageSession()) redirect("/admin");

  return (
    <main className="admin-login-grid min-h-screen">
      <section className="relative hidden overflow-hidden bg-[var(--ink)] p-12 text-[var(--paper)] lg:flex lg:flex-col lg:justify-between">
        <div className="admin-login-orbit" aria-hidden="true" />
        <p className="relative z-10 text-xs font-bold uppercase tracking-[0.22em] text-[var(--focus)]">
          Solar Operations / 09
        </p>
        <div className="relative z-10 max-w-xl">
          <span className="sun-mark" aria-hidden="true" />
          <p className="mt-7 font-display text-6xl font-semibold leading-[1.05]">
            Phòng điều độ dữ liệu mặt trời.
          </p>
          <p className="mt-6 max-w-lg text-base leading-8 text-[var(--line)]">
            Packages, giả định tính toán và yêu cầu khảo sát cùng chạy trên một đường dữ liệu duy nhất.
          </p>
        </div>
        <p className="relative z-10 text-xs uppercase tracking-[0.16em] text-[var(--line-strong)]">
          Phiên bảo mật · hết hạn sau 8 giờ
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-9">
          <div className="flex items-center gap-3">
            <span className="status-dot" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--success)]">
              Cổng nội bộ
            </p>
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold text-[var(--ink)]">
            Xác thực vận hành
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Dùng tài khoản được cấu hình trong biến môi trường của máy chủ.
          </p>
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}

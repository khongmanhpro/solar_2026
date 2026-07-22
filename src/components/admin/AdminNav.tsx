"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { requestJson } from "@/lib/api-client";

const NAV_ITEMS = [
  { href: "/admin", label: "Tổng quan", index: "01" },
  { href: "/admin/packages", label: "Gói hệ thống", index: "02" },
  { href: "/admin/settings", label: "Cấu hình", index: "03" },
  { href: "/admin/leads", label: "Khách hàng", index: "04" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await requestJson("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <>
      <nav aria-label="Điều hướng quản trị" className="admin-nav">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className="admin-nav-link"
              data-active={active}
              href={item.href}
              key={item.href}
            >
              <span aria-hidden="true">{item.index}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        className="admin-logout-button"
        disabled={loggingOut}
        onClick={logout}
        type="button"
      >
        {loggingOut ? "Đang thoát…" : "Đăng xuất"}
      </button>
    </>
  );
}

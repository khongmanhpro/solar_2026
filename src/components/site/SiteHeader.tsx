import Link from "next/link";

import { EvoSolarLogo } from "@/components/brand/EvoSolarLogo";
import type { ContactChannels } from "@/lib/contact-channels";

export function SiteHeader({ contact }: { contact: ContactChannels }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[86rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link
          aria-label="EvoSolar — Trang chủ"
          className="rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sun)] focus-visible:ring-offset-2"
          href="/"
        >
          <EvoSolarLogo height={28} />
        </Link>
        <nav aria-label="Liên hệ nhanh" className="flex items-center gap-2 sm:gap-3">
          {contact.phoneHref ? (
            <a
              className="hidden min-h-11 items-center rounded-[8px] px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--brand-soft)] sm:inline-flex"
              href={contact.phoneHref}
            >
              {contact.hotlineLabel}
            </a>
          ) : null}
          {contact.zaloHref ? (
            <a
              className="hidden min-h-11 items-center rounded-[8px] border border-[var(--ink)] px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--brand-soft)] md:inline-flex"
              href={contact.zaloHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              Nhắn Zalo
            </a>
          ) : null}
          <Link
            className="inline-flex min-h-11 items-center rounded-[8px] bg-[var(--sun)] px-4 text-sm font-bold text-[var(--ink)] hover:bg-[var(--sun-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2"
            href="/#cong-cu"
          >
            Tính tiết kiệm
          </Link>
        </nav>
      </div>
    </header>
  );
}

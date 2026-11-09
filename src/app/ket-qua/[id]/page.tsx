import type { Metadata } from "next";
import Link from "next/link";

import { CalculationResults } from "@/components/calculator/CalculationResults";
import { CalculationPreview } from "@/components/calculator/CalculationPreview";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { services } from "@/server/container";
import { getSiteContact } from "@/server/site-contact";

export const dynamic = "force-dynamic";

// Shared results are personal estimates: keep them out of search engines.
export const metadata: Metadata = {
  title: "Kết quả ước tính điện mặt trời",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" });

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await services.calculations.getShared(id);
  const retentionDays = services.calculations.getShareRetentionDays();
  const contact = await getSiteContact();

  return (
    <>
      <SiteHeader contact={contact} />
      <main className="min-h-screen overflow-x-hidden">
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4 print:mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-ink)]">
                Kết quả ước tính được chia sẻ
              </p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
                Phương án điện mặt trời
              </h1>
              {result ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Tính ngày {dateFormatter.format(new Date(result.metadata.createdAt))} · Link có hiệu lực khoảng {retentionDays} ngày
                  nếu chưa đăng ký khảo sát.
                </p>
              ) : null}
            </div>
            <Link
              className="min-h-11 rounded-[8px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 print:hidden"
              href="/"
            >
              Tính cho nhà bạn →
            </Link>
          </header>

          {result ? (
            result.recommendedPackage ? (
              <CalculationResults packages={result.sourceSnapshot.packages} result={result} />
            ) : (
              <CalculationPreview isSubmitting={false} packages={result.sourceSnapshot.packages} result={result} />
            )
          ) : (
            <section className="rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] px-6 py-12 text-center sm:px-10">
              <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Kết quả này không còn khả dụng</h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
                Link có thể đã hết hạn lưu ({retentionDays} ngày) hoặc không đúng. Bạn có thể tính lại trong khoảng một phút —
                không cần số điện thoại.
              </p>
              <Link
                className="mt-6 inline-flex min-h-11 items-center rounded-[8px] bg-[var(--sun)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--sun-hover)]"
                href="/"
              >
                Tính lại phương án
              </Link>
            </section>
          )}
        </div>
      </main>
      <SiteFooter contact={contact} />
    </>
  );
}

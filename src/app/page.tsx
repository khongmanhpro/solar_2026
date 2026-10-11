import { SolarCalculator } from "@/components/calculator/SolarCalculator";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-[86rem] px-4 py-6 sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <header className="max-w-4xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 shadow-sm">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-[var(--success)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
              Công cụ tính toán · Việt Nam
            </p>
          </div>

          <h1 className="hero-headline mt-5 font-display font-semibold text-[var(--ink)] sm:mt-8">
            Tính toán tiềm năng điện mặt trời cho ngôi nhà của bạn
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:mt-6 sm:text-lg sm:leading-8">
            Chỉ cần số tiền điện tháng gần nhất và vài câu hỏi đơn giản. Xem ngay chi phí, tiền tiết kiệm và thời gian hoàn vốn — không cần số điện thoại.
          </p>

          <div className="mt-5 hidden flex-wrap gap-2 sm:mt-8 sm:flex sm:gap-3">
            <span className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-1.5 text-sm font-medium text-[var(--muted)]">
              03 bước ngắn
            </span>
            <span className="rounded-full border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-1.5 text-sm font-medium text-[var(--muted)]">
              ~ 1 phút
            </span>
            <span className="rounded-full border border-[var(--line)] bg-[var(--brand-soft)] px-4 py-1.5 text-sm font-semibold text-[var(--brand-dark)]">
              Không cần số điện thoại
            </span>
          </div>
        </header>

        <SolarCalculator />

        <section aria-label="Cam kết của công cụ" className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {[
            ["Minh bạch", "Hiển thị giả định thay vì hứa hẹn tuyệt đối."],
            ["Riêng tư", "Xem kết quả trước, chưa cần để lại liên hệ."],
            ["Có cơ sở", "Nêu rõ dữ liệu đã biết, điều đang giả định và phần cần khảo sát."],
          ].map(([title, description]) => (
            <div className="bg-[var(--paper)] p-6" key={title}>
              <p className="font-display text-lg font-semibold text-[var(--ink)]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

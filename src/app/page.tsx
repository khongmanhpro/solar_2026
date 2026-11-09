import { SolarCalculator } from "@/components/calculator/SolarCalculator";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteContact } from "@/server/site-contact";

// Contact links come from admin settings, so render per request.
export const dynamic = "force-dynamic";

const STEPS = [
  ["01", "Nhập hóa đơn", "Số kWh hoặc tiền điện tháng gần nhất, tỉnh thành và thói quen dùng điện ban ngày."],
  ["02", "Xem phương án", "Gói phù hợp, tiền tiết kiệm từng tháng, thời gian hoàn vốn và kịch bản thận trọng."],
  ["03", "Kỹ sư khảo sát", "Chỉ khi bạn muốn: kỹ sư xem mái thực tế rồi mới chốt thiết bị và báo giá."],
] as const;

const PILLARS = [
  ["Minh bạch", "Công suất, sản lượng, thời gian hoàn vốn luôn đi kèm giả định và nguồn số liệu."],
  ["Tiến bộ", "Thiết bị, giám sát và dịch vụ được cập nhật theo công nghệ mới, không dừng ở lắp đặt."],
  ["Bền bỉ", "Hệ thống chạy 25 năm thì quan hệ với khách hàng cũng phải tính bằng thập kỷ."],
] as const;

const HONEST_CASES = [
  "Nhà dùng điện chủ yếu buổi tối và ít người ở nhà ban ngày — phần lớn điện mặt trời sẽ dư, tiền tiết kiệm thấp.",
  "Hóa đơn nhỏ, chỉ ở các bậc giá thấp — tiền tiết kiệm mỗi tháng ít nên hoàn vốn rất chậm.",
  "Mái bị che bóng nhiều hoặc kết cấu yếu — cần kỹ sư khảo sát trước khi nói đến con số.",
] as const;

const FAQS = [
  [
    "Con số trên công cụ chính xác đến đâu?",
    "Công cụ mô phỏng từng giờ trong 12 tháng theo bức xạ của tỉnh bạn chọn và biểu giá điện bậc thang hiện hành. Mỗi kết quả có thêm kịch bản thận trọng (sản lượng thấp hơn 10%) — chúng tôi khuyên bạn quyết định dựa trên kịch bản đó. Con số chốt cuối cùng có sau khi kỹ sư khảo sát mái.",
  ],
  [
    "Giá gói đã gồm những gì?",
    "Giá hiển thị là giá tham khảo đã gồm VAT, theo danh mục thiết bị đang bán. Thiết bị và vật tư cụ thể được xác nhận lại sau khảo sát.",
  ],
  [
    "Có tính tiền bán điện dư vào hoàn vốn không?",
    "Không. Thời gian hoàn vốn chỉ dựa trên tiền điện bạn bớt phải trả. Khoản bán điện dư (nếu đăng ký được) được ghi riêng để bạn tự cân nhắc.",
  ],
  [
    "Tôi có phải để lại số điện thoại không?",
    "Không. Bạn xem toàn bộ kết quả mà không cần số điện thoại. Chúng tôi chỉ liên hệ khi bạn chủ động đăng ký khảo sát.",
  ],
] as const;

export default async function Home() {
  const contact = await getSiteContact();

  return (
    <>
      <SiteHeader contact={contact} />
      <main className="min-h-screen overflow-x-hidden">
        <div className="mx-auto max-w-[86rem] px-4 py-8 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
          <header className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-ink)]">
              EvoSolar · Điện mặt trời mái nhà
            </p>

            <h1 className="hero-headline mt-4 font-extrabold text-[var(--ink)] sm:mt-6">
              Điện mặt trời, tính bằng chính hóa đơn của bạn.
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
              <span className="rounded-full border border-[var(--line)] bg-[var(--savings-soft)] px-4 py-1.5 text-sm font-semibold text-[var(--savings)]">
                Không cần số điện thoại
              </span>
            </div>
          </header>

          <div className="scroll-mt-24" id="cong-cu">
            <SolarCalculator />
          </div>

          <section aria-labelledby="steps-title" className="mt-16 sm:mt-20">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" id="steps-title">
              Ba bước, không ràng buộc
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {STEPS.map(([number, title, description]) => (
                <li className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-6" key={number}>
                  <p className="font-display text-sm font-extrabold text-[var(--accent-ink)]">{number}</p>
                  <p className="mt-2 font-display text-xl font-extrabold text-[var(--ink)]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="honest-title"
            className="mt-16 grid gap-8 rounded-[10px] bg-[var(--ink)] p-6 text-[var(--paper)] sm:mt-20 sm:p-10 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sun)]">Nói thật với bạn</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl" id="honest-title">
                Chúng tôi sẽ nói “chưa nên lắp” nếu không có lợi.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--line)]">
                Kết quả luôn có kịch bản thận trọng. Khi không có gói nào đáng tiền, công cụ nói thẳng thay vì cố bán.
              </p>
            </div>
            <ul className="space-y-3">
              {HONEST_CASES.map((item) => (
                <li className="flex gap-3 rounded-[8px] border border-[var(--admin-rail)] p-4 text-sm leading-6 text-[var(--line)]" key={item}>
                  <span aria-hidden="true" className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--sun)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Cam kết của EvoSolar" className="mt-16 grid gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)] sm:mt-20 sm:grid-cols-3">
            {PILLARS.map(([title, description]) => (
              <div className="bg-[var(--paper)] p-6" key={title}>
                <p className="font-display text-lg font-extrabold text-[var(--ink)]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="faq-title" className="mt-16 max-w-4xl sm:mt-20">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl" id="faq-title">
              Câu hỏi thường gặp
            </h2>
            <div className="mt-6 divide-y divide-[var(--line)] rounded-[10px] border border-[var(--line)] bg-[var(--paper)]">
              {FAQS.map(([question, answer]) => (
                <details className="group p-5 sm:p-6" key={question}>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[var(--ink)]">
                    {question}
                    <span aria-hidden="true" className="text-xl text-[var(--accent-ink)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter contact={contact} />
    </>
  );
}

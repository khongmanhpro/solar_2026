import { EvoSolarLogo } from "@/components/brand/EvoSolarLogo";
import type { ContactChannels } from "@/lib/contact-channels";

export function SiteFooter({ contact }: { contact: ContactChannels }) {
  return (
    <footer className="bg-[var(--ink)] text-[var(--line)] print:hidden">
      <div className="mx-auto grid max-w-[86rem] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-10">
        <div>
          <EvoSolarLogo height={30} variant="dark" />
          <p className="mt-4 font-display text-xl font-extrabold text-[var(--paper)]">
            Nắng Việt. Bước tiến xanh.
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--line-strong)]">
            Điện mặt trời mái nhà cho hộ gia đình và doanh nghiệp — số liệu rõ ràng, lắp đặt chuẩn kỹ thuật,
            đồng hành suốt vòng đời hệ thống.
          </p>
        </div>
        <div className="text-sm leading-7">
          <p className="font-semibold text-[var(--paper)]">Liên hệ</p>
          <ul className="mt-2 space-y-1">
            {contact.phoneHref ? (
              <li>
                Hotline{" "}
                <a className="font-semibold text-[var(--sun)] underline-offset-4 hover:underline" href={contact.phoneHref}>
                  {contact.hotlineLabel}
                </a>
              </li>
            ) : null}
            {contact.zaloHref ? (
              <li>
                <a
                  className="font-semibold text-[var(--sun)] underline-offset-4 hover:underline"
                  href={contact.zaloHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Nhắn Zalo cho kỹ sư
                </a>
              </li>
            ) : null}
            <li>evosolar.vn</li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-[var(--line-strong)]">
            Kết quả trên trang là ước tính, không phải báo giá chính thức. Kỹ sư sẽ khảo sát mái trước khi chốt phương án.
          </p>
        </div>
      </div>
    </footer>
  );
}

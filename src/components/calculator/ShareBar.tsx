"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/analytics";

interface ShareBarProps {
  calculationId: string;
}

function shareUrl(calculationId: string): string {
  return `${window.location.origin}/ket-qua/${encodeURIComponent(calculationId)}`;
}

/** Share the result with family (Zalo via the OS share sheet) or print it. */
export function ShareBar({ calculationId }: ShareBarProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function share() {
    const url = shareUrl(calculationId);
    const data = {
      title: "Phương án điện mặt trời cho nhà mình",
      text: "Xem ước tính điện mặt trời: tiết kiệm, hoàn vốn và các phương án.",
      url,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        trackEvent("result_shared", { method: "native" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Đã sao chép link — dán vào Zalo hoặc tin nhắn để gửi cho gia đình.");
      trackEvent("result_shared", { method: "copy" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(`Không chia sẻ tự động được. Link kết quả: ${url}`);
    }
  }

  function print() {
    // Expand collapsed sections so the printout / PDF is complete.
    document.querySelectorAll("details").forEach((element) => {
      element.open = true;
    });
    trackEvent("result_printed", {});
    window.print();
  }

  const buttonClass =
    "min-h-11 rounded-[8px] border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2";

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <button className={buttonClass} onClick={share} type="button">
        Gửi cho gia đình (Zalo, tin nhắn)
      </button>
      <button className={buttonClass} onClick={print} type="button">
        In / lưu PDF
      </button>
      {message ? (
        <p className="w-full break-all text-sm text-[var(--muted)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

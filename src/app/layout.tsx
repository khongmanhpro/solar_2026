import type { Metadata } from "next";

import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Công cụ tính toán điện mặt trời",
  description:
    "Ước tính chi phí lắp đặt, sản lượng điện, tiền tiết kiệm và thời gian hoàn vốn của hệ thống điện mặt trời.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

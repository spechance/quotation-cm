import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "全偲行銷報價單系統",
  description: "全偲行銷 - 線上報價單管理系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}

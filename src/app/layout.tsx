import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Maple Compass | Tax-Optimized Financial Roadmap",
  description:
    "A high-fidelity, tax-optimized financial roadmap for Canadians. Zero accounts, zero tracking, 100% private.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

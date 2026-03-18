import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandalay — Capacity-Routed LLM Gateway",
  description:
    "Multi-provider LLM API gateway with on-chain capacity routing. Powered by Backproto on Base.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

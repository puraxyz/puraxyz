import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Deck — Backproto Briefing Dashboard",
  description:
    "CEO-level briefing cards, concept explainers, and live metrics for the Backproto protocol.",
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

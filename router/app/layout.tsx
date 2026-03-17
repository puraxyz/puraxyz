import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backproto Router — Live Agent Economy",
  description:
    "Real-time dashboard showing a closed-loop backpressure economy with three agent personas on Base.",
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

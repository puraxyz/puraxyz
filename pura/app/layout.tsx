import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pura — Capacity-aware routing for the machine economy",
  description:
    "Route payments through on-chain capacity signals. Boltzmann-weighted routing, verified completions, overflow buffering. TCP-style congestion control for agent economies.",
  icons: {
    icon: "/pura-icon-sm.png",
    apple: "/pura-icon.png",
  },
  openGraph: {
    images: [{ url: "/pura-icon.png", width: 540, height: 540 }],
  },
  twitter: {
    card: "summary",
    images: ["/pura-icon.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Nav />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

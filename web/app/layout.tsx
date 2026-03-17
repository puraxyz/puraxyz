import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Backproto: Backpressure Economics for Decentralized Networks",
    template: "%s | Backproto",
  },
  description:
    "Universal capacity-constrained flow control across AI agents, Nostr relays, Lightning routing, and streaming payments.",
  metadataBase: new URL("https://backproto.io"),
  openGraph: {
    images: [{ url: "/backproto.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable}`}>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

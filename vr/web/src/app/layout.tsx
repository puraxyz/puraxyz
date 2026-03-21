import '@mantine/core/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { ClerkProvider } from '@clerk/nextjs';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { verifierCount, domainCount } from '@/data/registryStats';

import styles from './layout.module.css';
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'var(--font-jetbrains), monospace',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://vr.dev'),
  title: 'vr.dev | Verify What AI Agents Actually Changed',
  description: `Open-source verification layer for AI agents. Deterministic state checks, rubric-based scoring, and agentic probes, composed into trust pipelines for CI, evaluation, and RL training. ${verifierCount} verifiers across ${domainCount} domains.`,
  openGraph: {
    title: 'vr.dev | Verify What AI Agents Actually Changed',
    description: 'Open-source verification layer for AI agents. Deterministic state checks, rubric-based scoring, and agentic probes, composed into trust pipelines for CI, evaluation, and RL training.',
    url: 'https://vr.dev',
    siteName: 'vr.dev',
    images: [{ url: '/vrdev.png', width: 1200, height: 630, alt: 'vr.dev: Verify What AI Agents Actually Changed' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vr.dev | Verify What AI Agents Actually Changed',
    description: `Open-source verification layer for AI agents. ${verifierCount} verifiers across ${domainCount} domains.`,
    images: ['/vrdev.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: '#1a1a2e',
          colorText: '#ffffff',
          colorTextSecondary: '#a1a1aa',
          colorInputBackground: '#16213e',
          colorInputText: '#ffffff',
          colorNeutral: '#ffffff',
        },
        elements: {
          formButtonPrimary: {
            backgroundColor: '#7c3aed',
            color: '#ffffff',
          },
          card: {
            backgroundColor: '#1a1a2e',
            color: '#ffffff',
          },
          userButtonPopoverCard: {
            backgroundColor: '#1a1a2e',
          },
          userButtonPopoverActionButton: {
            color: '#ffffff',
          },
          userButtonPopoverActionButtonText: {
            color: '#ffffff',
          },
          userButtonPopoverActionButtonIcon: {
            color: '#a1a1aa',
          },
          userButtonPopoverFooter: {
            display: 'none',
          },
          userPreviewMainIdentifier: {
            color: '#ffffff',
          },
          userPreviewSecondaryIdentifier: {
            color: '#a1a1aa',
          },
          menuList: {
            backgroundColor: '#1a1a2e',
          },
          menuItem: {
            color: '#ffffff',
          },
          avatarBox: {
            width: 36,
            height: 36,
          },
        },
      }}
    >
      <html lang="en" data-mantine-color-scheme="dark" className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <head>
          <ColorSchemeScript forceColorScheme="dark" />
        </head>
        <Analytics/>
        <body className={styles.body}>
          <MantineProvider theme={theme} forceColorScheme="dark">
            <TopNav />
            <main className={styles.main}>{children}</main>
            <Footer />
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

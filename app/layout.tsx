import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Grocery Flow",
  description: "Track what the household buys each month, and plan the next one.",
};

export const viewport: Viewport = {
  // `cover` is what makes env(safe-area-inset-*) non-zero on notched phones,
  // which the bottom nav relies on.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#101210" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Tells the browser both themes are supported before first paint,
            which avoids a white flash on dark devices. */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

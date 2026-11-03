import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { StationShell } from "@/components/station-shell";

import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Play Station",
  description: "A self-hosted dial for English, Nigerian, and African live channels from the public iptv-org directory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <StationShell>{children}</StationShell>
      </body>
    </html>
  );
}

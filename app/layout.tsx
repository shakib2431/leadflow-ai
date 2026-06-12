import {
  NotificationProvider,
} from "@/lib/notification-context";
import type { Metadata } from "next";
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
  title: "LeadFlow AI",
  description:
    "AI-powered CRM built for modern businesses. Manage leads, conversations, follow-ups, analytics, and sales pipelines in one place.",

  openGraph: {
    title: "LeadFlow AI",
    description:
      "AI-powered CRM built for modern businesses.",
    type: "website",
    siteName: "LeadFlow AI",
  },

  icons: {
    icon: "/favicon.ico",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
   <body className="min-h-full flex flex-col">

  <NotificationProvider>
    {children}
  </NotificationProvider>

</body>
    </html>
  );
}

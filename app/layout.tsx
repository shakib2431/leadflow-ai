import {
  NotificationProvider,
} from "@/lib/notification-context";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CommandPalette } from "@/components/command-palette";

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
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
      className={`h-full antialiased ${inter.variable} ${plusJakarta.variable}`}
    >
   <body className="min-h-full flex flex-col">

  <NotificationProvider>
          {/* Command Palette is now global */}
          <CommandPalette />
          
          {/* Only one instance of children here */}
          {children}
        </NotificationProvider>

</body>
    </html>
  );
}


import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppMain } from "@/components/layout/AppMain";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mercurius Quote",
  description: "AI-powered professional quotes for SWFL contractors",
  icons: {
    icon: "/mercurius-logo.png",   // ← Changed to .png
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.className} font-sans`}>
        <AppProviders>
          <AppHeader />
          <AppMain>{children}</AppMain>
        </AppProviders>
      </body>
    </html>
  );
}

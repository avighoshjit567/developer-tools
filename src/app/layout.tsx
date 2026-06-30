import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xCloud Tools — Instant Domain Diagnostics",
  description:
    "Free domain diagnostic toolkit for agencies & developers. Analyze registrar, DNS, SSL, email authentication, security headers, blacklists, and more.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "xCloud Tools — Instant Domain Diagnostics",
    description:
      "One scan. Full picture. Registration, DNS, SSL, email auth, security headers, and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[var(--bg-secondary)] font-sans antialiased">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

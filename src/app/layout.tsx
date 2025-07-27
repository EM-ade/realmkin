import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Web3Provider } from "@/contexts/Web3Context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Hertical Sans Regular font for header
const herticalSans = localFont({
  src: "../../public/fonts/Hertical Sans Regular.otf",
  variable: "--font-hertical-sans",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

// Amnestia font for login page
const amnestia = localFont({
  src: "../../public/fonts/Amnestia.ttf",
  variable: "--font-amnestia",
  fallback: ["serif"],
});

export const metadata: Metadata = {
  title: "Realmkin - Holders Login",
  description: "Realmkin Web3 NFT Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${herticalSans.variable} ${amnestia.variable} antialiased`}
      >
        <AuthProvider>
          <Web3Provider>{children}</Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}

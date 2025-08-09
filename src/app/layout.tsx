import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Web3Provider } from "@/contexts/Web3Context";
import { NFTProvider } from "@/contexts/NFTContext";

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

// Impact Regular font for welcome text
const impactRegular = localFont({
  src: "../../public/fonts/Impact Regular.ttf",
  variable: "--font-impact-regular",
  fallback: ["Impact", "Arial Black", "sans-serif"],
});

// Gothic CG No3 Regular font for section headers
const gothicCG = localFont({
  src: "../../public/fonts/Gothic CG No3 Regular.otf",
  variable: "--font-gothic-cg",
  fallback: ["Arial", "sans-serif"],
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
        className={`${herticalSans.variable} ${amnestia.variable} ${impactRegular.variable} ${gothicCG.variable} antialiased`}
      >
        <AuthProvider>
          <Web3Provider>
            <NFTProvider>{children}</NFTProvider>
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}

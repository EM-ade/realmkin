import type { Metadata } from "next";
import type { Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Web3Provider } from "@/contexts/Web3Context";
import { NFTProvider } from "@/contexts/NFTContext";
import { StakingProvider } from "@/contexts/StakingContext";
import { DiscordProvider } from "@/contexts/DiscordContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import SolanaWalletProvider from "@/contexts/SolanaWalletProvider";
import RouteTransition from "@/components/RouteTransition";
import GlobalNavigation from "@/components/GlobalNavigation";
import OnboardingWizard from "@/components/OnboardingWizard";
import GlobalMobileNavigation from "@/components/GlobalMobileNavigation";
import DynamicIsland from "@/components/DynamicIsland";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { suppressProductionLogs } from "@/utils/devLogger";

// Suppress console logs in production
if (typeof window !== "undefined") {
  suppressProductionLogs();
}

// Hertical Sans Regular font for header
const herticalSans = localFont({
  src: "../../public/fonts/Hertical Sans Regular.otf",
  variable: "--font-hertical-sans",
  fallback: ["Helvetica", "Arial", "sans-serif"],
  display: "swap",
  preload: true,
});

// Amnestia font for login page
const amnestia = localFont({
  src: "../../public/fonts/Amnestia.ttf",
  variable: "--font-amnestia",
  fallback: ["serif"],
  display: "swap",
  preload: true,
});

// Impact Regular font for welcome text
const impactRegular = localFont({
  src: "../../public/fonts/Impact Regular.ttf",
  variable: "--font-impact-regular",
  fallback: ["Impact", "Arial Black", "sans-serif"],
  display: "swap",
  preload: true,
});

// Gothic CG No3 Regular font for section headers
const gothicCG = localFont({
  src: "../../public/fonts/Gothic CG No3 Regular.otf",
  variable: "--font-gothic-cg",
  fallback: ["Arial", "sans-serif"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "The Realmkin Official Website",
  description: "Realmkin Web3 NFT Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        {/* Material Symbols Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${herticalSans.variable} ${amnestia.variable} ${impactRegular.variable} ${gothicCG.variable} antialiased`}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            #__next-loading-screen {
              position: fixed;
              inset: 0;
              background: #000000;
              z-index: 99999;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .hydrated #__next-loading-screen {
              display: none;
            }
          `,
          }}
        />
        <div id="__next-loading-screen">
          <div
            style={{
              width: "60px",
              height: "60px",
              border: "3px solid #DA9C2F",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `,
          }}
        />
        <AuthProvider>
          <SolanaWalletProvider>
            <Web3Provider>
              <DiscordProvider>
                <OnboardingProvider>
                  <StakingProvider>
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        className:
                          "bg-black text-[#DA9C2F] font-medium border-2 border-[#DA9C2F]",
                        success: {
                          className:
                            "bg-black text-[#DA9C2F] font-medium border-2 border-[#DA9C2F]",
                          iconTheme: {
                            primary: "#DA9C2F",
                            secondary: "#000000",
                          },
                        },
                        error: {
                          className:
                            "bg-black text-[#DA9C2F] font-medium border-2 border-[#DA9C2F]",
                          iconTheme: {
                            primary: "#DA9C2F",
                            secondary: "#000000",
                          },
                        },
                        loading: {
                          className:
                            "bg-black text-[#DA9C2F] font-medium border-2 border-[#DA9C2F]",
                          iconTheme: {
                            primary: "#DA9C2F",
                            secondary: "#000000",
                          },
                        },
                      }}
                    />
                    <GlobalNavigation />
                    <GlobalMobileNavigation />
                    <OnboardingWizard />
                    <RouteTransition>
                      <NFTProvider>{children}</NFTProvider>
                    </RouteTransition>
                  </StakingProvider>
                </OnboardingProvider>
              </DiscordProvider>
            </Web3Provider>
          </SolanaWalletProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

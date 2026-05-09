import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import VisitorTracker from "@/components/VisitorTracker";
import Image from "next/image";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vivah Bandhan | Premium Hindu Matrimonial Gateway",
  description: "Enter Vivah Bandhan - the ultimate, zero-cost Hindu matrimonial platform with premium AI matching and divine aesthetics.",
  keywords: "matrimonial, hindu marriage, shaadi, vivah bandhan, soulmate, indian wedding",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png" },
      { url: "/icon-512x512.png", sizes: "512x512" },
    ],
    shortcut: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vivah Bandhan",
  },
};

export const viewport = {
  themeColor: "#C5A059",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full bg-[#0a0a0a] text-white selection:bg-gold/30 selection:text-gold overflow-x-hidden">
        {/* Global Cinematic Background Layer */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Image 
            src="/royal-bg.png"
            alt="Royal Background"
            fill
            className="object-cover opacity-40 scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(197,160,89,0.15),transparent_70%)]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]" />
        </div>

        <div className="relative z-10 min-h-full flex flex-col">
          <ErrorBoundary>
            <AuthProvider>
              <AuthGuard>
                <VisitorTracker />
                {children}
              </AuthGuard>
            </AuthProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}

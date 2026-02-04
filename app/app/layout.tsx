import type { Metadata } from "next";
import { Instrument_Serif, Poppins } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sealed Bid Auction",
  description: "A private financial instrument.",
};

import { ToastProvider } from "@/components/ui/Toast";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/layout/Footer";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";

import { LoadingProvider } from "@/components/providers/LoadingProvider";
import { LoadingBar } from "@/components/ui/LoadingBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning={true}
        className={`${instrumentSerif.variable} ${poppins.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <WalletContextProvider>
          <LoadingProvider>
            <LoadingBar />
            <ToastProvider>
              <Header />
              <div className="flex-1 w-full">
                {children}
              </div>
              <Footer />
              <Toaster />
            </ToastProvider>
          </LoadingProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}

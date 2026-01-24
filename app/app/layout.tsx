import type { Metadata } from "next";
import { Instrument_Serif, Poppins } from "next/font/google";
import { ToastProvider } from "../components/ui/Toast";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sealed Bid Auction",
  description: "A private financial instrument.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSerif.variable} ${poppins.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <ToastProvider>
          <Header />
          <div className="flex-1 w-full">
            {children}
          </div>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}

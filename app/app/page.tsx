import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6 md:p-12">



      {/* Hero Section */}
      <section className="max-w-4xl w-full flex flex-col items-start gap-8 z-10 mt-20 md:mt-0">
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[1.1] opacity-0 animate-rise-up">
          The quiet standard <br />
          for private auctions.
        </h1>

        <p className="font-sans text-foreground/60 text-lg md:text-xl max-w-lg leading-relaxed opacity-0 animate-fade-in-delayed delay-150">
          Cryptographically secure market issuance. Zero information leakage.
          Bid with absolute authority.
        </p>

        <div className="pt-8 opacity-0 animate-fade-in-delayed delay-300 flex flex-col sm:flex-row gap-6 items-center">
          <Button variant="link" asChild className="text-lg pl-0">
            <Link href="/explore">Explore Open Markets &rarr;</Link>
          </Button>
          <Button variant="link" asChild className="text-lg text-[#888888] hover:text-white transition-colors">
            <Link href="/create">Create Auction</Link>
          </Button>
        </div>
      </section>

      {/* Subtle Background Elements */}
      {/* <div className="absolute bottom-12 left-6 md:left-12 opacity-0 animate-fade-in delay-700">
        <span className="font-mono text-xs text-foreground/30 uppercase tracking-widest">
          System Status: Online
        </span>
      </div> */}
    </main>
  );
}

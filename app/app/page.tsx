"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6 md:p-12 bg-background">

      {/* Navigation (Simple) */}
      <nav className={`absolute top-0 left-0 w-full p-6 md:p-12 flex justify-between items-center z-50 ${mounted ? 'opacity-0 animate-fade-in' : 'opacity-100'}`}>
        <span className="font-display text-xl tracking-tight">Sealed Bid</span>
        <div className="flex gap-6">
          <Button variant="link" asChild className="text-sm">
            <Link href="/how-it-works">Protocol</Link>
          </Button>
          <Button variant="link" asChild className="text-sm">
            <Link href="/explore">Auctions</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl w-full flex flex-col items-start gap-8 z-10 mt-20 md:mt-0">
        <h1 className={`font-display text-5xl md:text-7xl lg:text-8xl leading-[1.1] ${mounted ? 'opacity-0 animate-rise-up' : 'opacity-100'}`}>
          The quiet standard <br />
          for private auctions.
        </h1>

        <p 
          className={`font-sans text-foreground/60 text-lg md:text-xl max-w-lg leading-relaxed ${mounted ? 'opacity-0 animate-fade-in' : 'opacity-100'}`}
          style={mounted ? { animationDelay: '150ms' } : {}}
        >
          Cryptographically secure market issuance. Zero information leakage.
          Bid with absolute authority.
        </p>

        <div 
          className={`pt-8 flex flex-col sm:flex-row gap-6 items-center ${mounted ? 'opacity-0 animate-fade-in' : 'opacity-100'}`}
          style={mounted ? { animationDelay: '300ms' } : {}}
        >
          <Button variant="link" asChild className="text-lg">
            <Link href="/explore">Explore Open Markets &rarr;</Link>
          </Button>
        </div>
      </section>

      {/* Subtle Background Elements */}
      <div 
        className={`absolute bottom-12 left-6 md:left-12 ${mounted ? 'opacity-0 animate-fade-in' : 'opacity-100'}`}
        style={mounted ? { animationDelay: '700ms' } : {}}
      >
        <span className="font-mono text-xs text-foreground/30 uppercase tracking-widest">
          System Status: Online
        </span>
      </div>
    </main>
  );
}

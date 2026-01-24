"use client";

import React from "react";
import Link from "next/link";

// Mock Data
const AUCTIONS = [
    { id: "1", title: "Meridian Bond 004", price: "45.00 ETH", endsIn: "2h 45m" },
    { id: "2", title: "Archive Key #882", price: "12.50 ETH", endsIn: "6h 15m" },
    { id: "3", title: "Stellar Drift Alpha", price: "8.20 ETH", endsIn: "12h 00m" },
    { id: "4", title: "Obsidian Shard", price: "155.00 ETH", endsIn: "1d 04h" },
];

export default function ExplorePage() {
    return (
        <main className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-16 opacity-0 animate-fade-in">
                <h1 className="font-display text-4xl text-foreground">Open Markets</h1>
                <span className="font-mono text-xs text-foreground/40 uppercase tracking-widest">
                    {AUCTIONS.length} Active Listings
                </span>
            </div>

            <div className="flex flex-col gap-0 w-full">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-foreground/10 text-xs font-mono text-foreground/40 uppercase tracking-wider opacity-0 animate-fade-in delay-150">
                    <div className="col-span-6 md:col-span-5">Asset</div>
                    <div className="col-span-3 text-right">Current Bid</div>
                    <div className="col-span-3 md:col-span-2 text-right">Ending</div>
                    <div className="col-span-0 md:col-span-2 hidden md:block text-right"></div>
                </div>

                {/* Rows */}
                <div className="opacity-0 animate-rise-up delay-300">
                    {AUCTIONS.map((auction, i) => (
                        <Link
                            key={auction.id}
                            href={`/auctions/${auction.id}`}
                            className="group grid grid-cols-12 gap-4 px-4 py-8 border-b border-foreground/5 items-center transition-all duration-300 hover:bg-foreground/[0.02]"
                            style={{ animationDelay: `${300 + (i * 50)}ms` }}
                        >
                            <div className="col-span-6 md:col-span-5 font-display text-2xl text-foreground group-hover:pl-2 transition-all duration-300">
                                {auction.title}
                            </div>
                            <div className="col-span-3 text-right font-sans text-foreground/80">
                                {auction.price}
                            </div>
                            <div className="col-span-3 md:col-span-2 text-right font-sans text-foreground/60 tabular-nums">
                                {auction.endsIn}
                            </div>
                            <div className="col-span-0 md:col-span-2 hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-xs uppercase tracking-widest border-b border-foreground text-foreground">View</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}

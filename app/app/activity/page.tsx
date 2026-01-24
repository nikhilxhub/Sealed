"use client";

import React from "react";

const ACTIVITY_DATA = [
    { id: "1", action: "Bid Placed", asset: "Meridian Bond 004", details: "Encrypted (Poly-G2)", time: "10 mins ago", status: "Confirming" },
    { id: "2", action: "Listing Created", asset: "Obsidian Shard", details: "Reserve: 155 ETH", time: "2 days ago", status: "Active" },
    { id: "3", action: "Bid Revealed", asset: "Archive Key #882", details: "Did not win", time: "5 days ago", status: "Closed" },
];

export default function ActivityPage() {
    return (
        <main className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto pt-24">
            <div className="mb-12">
                <h1 className="font-display text-4xl mb-2">Ledger Activity</h1>
                <p className="font-sans text-foreground/40 text-sm">
                    Immutable record of your interactions.
                </p>
            </div>

            <div className="w-full text-sm font-sans">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-foreground/10 text-foreground/40 font-mono text-xs uppercase tracking-widest px-4">
                    <div className="col-span-2">Type</div>
                    <div className="col-span-4">Asset Reference</div>
                    <div className="col-span-3">Payload</div>
                    <div className="col-span-2 text-right">Timestamp</div>
                    <div className="col-span-1 text-right">Status</div>
                </div>

                {/* Rows */}
                <div className="opacity-0 animate-fade-in">
                    {ACTIVITY_DATA.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 py-6 border-b border-foreground/5 items-center hover:bg-foreground/[0.01] transition-colors px-4">
                            <div className="col-span-2 text-foreground/80">{item.action}</div>
                            <div className="col-span-4 font-mono text-foreground/60">{item.asset}</div>
                            <div className="col-span-3 text-foreground/40 italic">{item.details}</div>
                            <div className="col-span-2 text-right text-foreground/40 font-mono">{item.time}</div>
                            <div className="col-span-1 text-right">
                                <span className={`inline-block px-2 py-1 text-[10px] uppercase tracking-wider border ${item.status === "Active" ? "border-green-500/20 text-green-500/80" :
                                        item.status === "Closed" ? "border-foreground/20 text-foreground/40" :
                                            "border-yellow-500/20 text-yellow-500/80"
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State / Footer */}
                {ACTIVITY_DATA.length === 0 && (
                    <div className="py-24 text-center text-foreground/30 font-mono text-xs">No recorded activity on this chain.</div>
                )}
            </div>
        </main>
    );
}

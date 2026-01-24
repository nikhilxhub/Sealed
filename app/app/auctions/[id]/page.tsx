"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/ui/input-with-label";

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
    const [bidAmount, setBidAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "encrypting" | "submitted">("idle");
    const [error, setError] = useState("");

    // This would handle the params unwrapping in a real server component, 
    // but for a client component we can just use the prop or hooks if needed.
    // For now assuming static ID for demo or prop drilling.

    const handleBid = async () => {
        if (!bidAmount) {
            setError("Bid amount is required");
            return;
        }
        setError("");
        setStatus("encrypting");

        // Simulate encryption/submission delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setStatus("submitted");
    };

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 lg:gap-24 items-start justify-center pt-24">

            {/* NFT Preview (Static, Calm) */}
            <div className="w-full md:w-1/2 max-w-[600px] opacity-0 animate-fade-in">
                <div className="aspect-[4/5] bg-foreground/5 border border-foreground/10 flex items-center justify-center relative">
                    {/* Placeholder for NFT Image */}
                    <span className="font-mono text-xs text-foreground/20 uppercase tracking-widest">
                        Detailed Preview Unavailable
                    </span>
                    <div className="absolute inset-0 border border-foreground/5 pointer-events-none"></div>
                </div>
            </div>

            {/* Bidding UI (Serious, Deliberate) */}
            <div className="w-full md:w-1/2 max-w-lg flex flex-col gap-12 opacity-0 animate-rise-up delay-150">

                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-foreground/10 pb-4">
                        <h1 className="font-display text-4xl m-0">Meridian Bond 004</h1>
                        <span className="font-mono text-sm text-foreground/50">#004</span>
                    </div>
                    <div className="flex gap-8">
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-foreground/40 uppercase tracking-widest mb-1">Current Bid</span>
                            <span className="font-sans text-xl">45.00 ETH</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-foreground/40 uppercase tracking-widest mb-1">Ends In</span>
                            <span className="font-sans text-xl">2h 45m</span>
                        </div>
                    </div>
                </div>

                {/* Bid Form */}
                <div className="space-y-8">
                    {status === "idle" ? (
                        <>
                            <InputWithLabel
                                label="Your Bid Amount (ETH)"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                error={error}
                                type="number"
                                min="0"
                                step="0.01"
                            />
                            <div className="pt-4">
                                <Button
                                    onClick={handleBid}
                                    className="w-full bg-foreground text-background hover:bg-foreground/90 py-4 text-lg"
                                >
                                    Place Encrypted Bid
                                </Button>
                                <p className="text-xs text-foreground/30 text-center mt-4 font-sans max-w-xs mx-auto">
                                    Bids are encrypted client-side. The auctioneer cannot see your value until reveal.
                                </p>
                            </div>
                        </>
                    ) : status === "encrypting" ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 animate-fade-in">
                            <span className="font-mono text-xs uppercase tracking-widest animate-pulse">Encrypting Bid Data...</span>
                            <div className="h-[1px] w-48 bg-foreground/10 overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full w-full bg-foreground origin-left animate-[progress_1.5s_ease-in-out_infinite]" style={{ transformOrigin: "0% 50%" }} />
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center gap-6 animate-fade-in">
                            <div className="text-2xl font-display">Bid Securely Locked</div>
                            <Button onClick={() => setStatus("idle")} variant="ghost">Return to Auction</Button>
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}

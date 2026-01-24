"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

// Mock Outcome Data
const OUTCOME = {
    title: "Meridian Bond 004",
    id: "1",
    winner: "0x3f...8291",
    winningBid: "52.50 ETH",
    userStatus: "winner", // 'winner' | 'outbid' | 'seller' | 'observer'
    txHash: "0x7a3f...9c21"
};

export default function AuctionResultPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0E0F12] text-white animate-fade-in-slow">

            <div className="w-full max-w-[560px] flex flex-col items-center text-center">

                {/* NFT Thumbnail */}
                <div className="w-24 h-24 mb-8 bg-[#15171C] border border-[#24262D] flex items-center justify-center">
                    <span className="text-[10px] uppercase font-mono text-[#4A4D55]">Img</span>
                </div>

                {/* Outcome Headline */}
                <h1 className="font-display text-[2rem] leading-tight mb-2 animate-pulse-subtle">
                    {OUTCOME.userStatus === 'winner' && "You won this auction"}
                    {OUTCOME.userStatus === 'outbid' && "Your bid was returned"}
                    {OUTCOME.userStatus === 'seller' && "Auction settled"}
                    {OUTCOME.userStatus === 'observer' && "Auction ended"}
                </h1>

                {/* Metadata */}
                <div className="flex flex-col gap-1 mb-12">
                    <span className="font-sans text-[#B5B8C1] text-sm">Winning Bid</span>
                    <span className="font-display text-4xl">{OUTCOME.winningBid}</span>
                    <span className="font-sans text-[#B5B8C1] text-sm mt-2">
                        Winner: <span className="font-mono text-white">{OUTCOME.winner}</span>
                    </span>
                </div>

                {/* Actions based on role */}
                {OUTCOME.userStatus === 'winner' && (
                    <button className="w-full bg-white text-[#0E0F12] font-medium py-4 rounded-sm hover:bg-[#EDEDED] transition-colors mb-6">
                        Claim Asset
                    </button>
                )}

                {OUTCOME.userStatus === 'outbid' && (
                    <div className="mb-8">
                        <a href="#" className="flex items-center gap-1 text-[#EDEDED] hover:underline decoration-1 underline-offset-4 text-sm">
                            View return transaction <ExternalLink size={14} />
                        </a>
                    </div>
                )}

                {/* Footer Links */}
                <Link
                    href="/activity"
                    className="
                        px-6 py-3 border border-transparent 
                        text-[#B5B8C1] hover:text-white hover:border-[#24262D] rounded-sm 
                        transition-all duration-200
                    "
                >
                    Return to activity
                </Link>

            </div>
        </main>
    );
}

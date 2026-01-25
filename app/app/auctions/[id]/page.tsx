"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { addToast } = useToast();
    const [bidAmount, setBidAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "encrypting" | "submitted" | "reveal">("idle");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Reveal State
    const [revealProgress, setRevealProgress] = useState(0);
    const [revealedCount, setRevealedCount] = useState(0);
    const TOTAL_BIDS = 142;

    const handleBid = async () => {
        if (!bidAmount) return;
        setStatus("encrypting");

        // Simulate encryption delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStatus("submitted");
        setShowConfirmModal(true);
    };

    const toggleReveal = () => {
        setStatus("reveal");
        // ... previous reveal logic if needed, simplified for visual demo
    };

    return (
        <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row animate-fade-in">

            {/* Left Side: Visual (50%) */}
            <div className="w-full md:w-1/2 h-[50vh] md:h-screen relative border-b md:border-b-0 md:border-r border-[#333333]">
                {/* Visual Placeholder: Wireframe Style */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#050505] overflow-hidden">
                    {/* Diagonal Line */}
                    <div className="absolute inset-0 border-t border-[#333333] -rotate-45 scale-150 origin-center opacity-50"></div>
                    {/* Placeholder Text */}
                    <span className="font-mono text-xs text-[#333333] uppercase tracking-widest z-10 bg-[#050505] px-4 py-2 border border-[#333333]">
                        No Preview Available
                    </span>
                </div>
            </div>

            {/* Right Side: Data & Interaction (50%) */}
            <div className="w-full md:w-1/2 min-h-[50vh] md:h-screen flex flex-col pt-24 md:pt-32 px-6 md:px-16 lg:px-24 pb-12 relative overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="mb-16 md:mb-24">
                    <div className="flex items-start justify-between mb-2">
                        <h1 className="font-display text-5xl md:text-6xl text-white leading-[0.9] tracking-tight max-w-md">
                            Meridian <br /> Bond 004
                        </h1>
                        <span className="font-mono text-xs text-[#888888] mt-2">#004</span>
                    </div>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-8 mb-16 border-t border-[#333333] pt-8">
                    <div className="flex flex-col gap-2">
                        <span className="font-mono text-[10px] text-[#888888] uppercase tracking-widest">Minimum Bid</span>
                        <span className="font-mono text-2xl md:text-3xl text-white">45.00 SOL</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="font-mono text-[10px] text-[#888888] uppercase tracking-widest">Ends In</span>
                        <span className="font-mono text-2xl md:text-3xl text-white">2h 45m</span>
                    </div>
                </div>

                {/* Interaction Area */}
                <div className="mt-auto md:mt-0 space-y-8">
                    {status === "idle" || status === "submitted" ? (
                        <>
                            {/* Mechanical Input */}
                            <div className="relative group">
                                <label
                                    htmlFor="bid-input"
                                    className={`
                                        font-mono text-[10px] uppercase tracking-widest transition-colors duration-200
                                        ${isFocused || bidAmount ? "text-white" : "text-[#888888]"}
                                    `}
                                >
                                    Bid Amount (SOL)
                                </label>
                                <input
                                    id="bid-input"
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder="0.00"
                                    className={`
                                        w-full bg-transparent border-b border-[#333333] py-4 text-3xl md:text-4xl font-mono text-white placeholder-[#333333]
                                        focus:outline-none focus:border-white transition-colors duration-200 rounded-none caret-white
                                    `}
                                />
                            </div>

                            {/* Mechanical Button */}
                            <button
                                onClick={handleBid}
                                disabled={!bidAmount || status === "submitted"}
                                className={`
                                    w-full py-4 px-6 mt-8 font-mono text-sm uppercase tracking-wider transition-all duration-150 border border-transparent
                                    ${status === "submitted"
                                        ? "bg-[#333333] text-[#888888] cursor-not-allowed"
                                        : "bg-white text-black hover:bg-black hover:text-white hover:border-white"}
                                `}
                            >
                                {status === "submitted" ? "Bid Submitted" : "Place Encrypted Bid"}
                            </button>
                        </>
                    ) : (
                        /* Encryption/Loading State */
                        <div className="py-12 flex flex-col items-start gap-4">
                            <span className="font-mono text-xs text-[#888888] uppercase tracking-widest animate-pulse">
                                Encrypting Bid...
                            </span>
                            <div className="h-[1px] w-full bg-[#333333] overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full w-full bg-white origin-left animate-[progress_1s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    )}

                    <div className="pt-8 border-t border-[#333333] flex justify-between items-center text-[#444444]">
                        <span className="font-mono text-[10px] uppercase tracking-widest hover:text-[#888888] cursor-pointer transition-colors">
                            View Contract
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest hover:text-[#888888] cursor-pointer transition-colors">
                            FAQ
                        </span>
                    </div>
                </div>
            </div>

            {/* Bid Confirmation Modal (Kept minimal but consistent) */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                className="max-w-[420px] bg-[#050505] border border-[#333333]"
            >
                <div className="flex flex-col items-center text-center p-6">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full border border-[#333333] mb-6 text-white">
                        <Check size={20} strokeWidth={1} />
                    </div>

                    <h2 className="font-display text-3xl text-white mb-2">Bid Locked</h2>
                    <p className="font-mono text-xs text-[#888888] mb-8 uppercase tracking-wider">
                        Awaiting Reveal Phase
                    </p>

                    <button
                        onClick={() => setShowConfirmModal(false)}
                        className="w-full py-3 bg-white text-black font-mono text-sm uppercase hover:bg-[#E5E5E5] transition-colors"
                    >
                        Close Receipt
                    </button>
                </div>
            </Modal>
        </main>
    );
}

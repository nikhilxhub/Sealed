"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/ui/input-with-label";
import { Modal } from "@/components/ui/Modal";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { addToast } = useToast();
    const [bidAmount, setBidAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "encrypting" | "submitted" | "reveal">("idle");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [error, setError] = useState("");

    // Reveal State
    const [revealProgress, setRevealProgress] = useState(0);
    const [revealedCount, setRevealedCount] = useState(0);
    const TOTAL_BIDS = 142;

    const handleBid = async () => {
        if (!bidAmount) return setError("Bid amount required");
        setError("");
        setStatus("encrypting");

        // Simulate encryption delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStatus("submitted");
        setShowConfirmModal(true);
        addToast("Bid submitted successfully", "success");
    };

    // Simulate Reveal Phase Trigger (For demo, user can click a hidden button or we auto-trigger after some time)
    // For this implementation, I'll add a developer toggle to switch to "Reveal Phase"
    const toggleReveal = () => {
        setStatus("reveal");
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setRevealProgress(progress);
            setRevealedCount(Math.floor((progress / 100) * TOTAL_BIDS));

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    router.push(`/auctions/${params.id}/results`);
                }, 1000);
            }
        }, 200);
    };

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-[1200px] mx-auto flex flex-col md:flex-row gap-12 lg:gap-24 items-start justify-center pt-24 animate-fade-in">

            {/* NFT Preview */}
            <div className="w-full md:w-1/2 max-w-[600px]">
                <div className="aspect-[4/5] bg-[#15171C] border border-[#24262D] flex items-center justify-center relative">
                    <span className="font-mono text-xs text-[#B5B8C1] uppercase tracking-widest">
                        Detailed Preview Unavailable
                    </span>
                    {/* Developer Toggle for Demo */}
                    <button onClick={toggleReveal} className="absolute bottom-2 right-2 text-[10px] text-[#24262D] hover:text-[#B5B8C1]">
                        [Dev: Trigger Reveal]
                    </button>
                    <div className="absolute inset-0 border border-[#24262D] pointer-events-none"></div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-1/2 max-w-lg flex flex-col gap-12 animate-rise-up delay-150">

                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-[#24262D] pb-4">
                        <h1 className="font-display text-4xl text-white m-0">Meridian Bond 004</h1>
                        <span className="font-mono text-sm text-[#B5B8C1]">#004</span>
                    </div>
                    <div className="flex gap-8">
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-[#B5B8C1] uppercase tracking-widest mb-1">Current Bid</span>
                            <span className="font-sans text-xl text-white">45.00 ETH</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-[#B5B8C1] uppercase tracking-widest mb-1">Ends In</span>
                            <span className="font-sans text-xl text-white">2h 45m</span>
                        </div>
                    </div>
                </div>

                {/* State: Reveal Phase */}
                {status === "reveal" ? (
                    <div className="space-y-8 py-12">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <span className="font-display text-2xl text-white">
                                    {revealProgress < 100 ? "Revealing bids…" : "Reveal complete"}
                                </span>
                                <span className="font-mono text-sm text-[#B5B8C1]">
                                    {revealedCount} / {TOTAL_BIDS}
                                </span>
                            </div>
                            {/* Discrete Progress Bar */}
                            <div className="h-[2px] w-full bg-[#24262D] relative">
                                <div
                                    className="h-full bg-[#EDEDED] transition-all duration-200 ease-linear"
                                    style={{ width: `${revealProgress}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-sm text-[#B5B8C1]">
                            Decrypting sealed bids on-chain. Please wait...
                        </p>
                    </div>
                ) : (
                    /* State: Bidding Phase */
                    <div className="space-y-8">
                        {status === "encrypting" ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4 animate-fade-in">
                                <span className="font-sans text-sm text-[#B5B8C1]">Encrypting…</span>
                                <div className="h-[1px] w-48 bg-[#24262D] overflow-hidden relative">
                                    <div className="absolute top-0 left-0 h-full w-0 bg-[#EDEDED] origin-left animate-[progress_1.5s_ease-in-out_infinite]" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <InputWithLabel
                                    label="Your Bid Amount (ETH)"
                                    value={status === "submitted" ? "" : bidAmount} // Clear visually on submit
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    error={error}
                                    type="number"
                                    placeholder={status === "submitted" ? "Bid placed" : "0.00"}
                                    disabled={status === "submitted"}
                                />
                                <div className="pt-4">
                                    <Button
                                        onClick={handleBid}
                                        disabled={status === "submitted"}
                                        className="
                                            w-full bg-white text-[#0E0F12] hover:bg-[#EDEDED] py-4 text-lg 
                                            disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-medium
                                        "
                                    >
                                        {status === "submitted" ? "Bid Placed" : "Place Encrypted Bid"}
                                    </Button>
                                    <p className="text-xs text-[#B5B8C1] text-center mt-4 font-sans max-w-xs mx-auto">
                                        Bids are encrypted client-side. The auctioneer cannot see your value until reveal.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Bid Confirmation Modal */}
                <Modal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    className="max-w-[420px]"
                >
                    <div className="flex flex-col items-center text-center animate-fade-in">
                        {/* Checkmark Animation */}
                        <div className="w-12 h-12 flex items-center justify-center rounded-full border border-[#24262D] mb-6 text-[#EDEDED]">
                            <Check size={24} strokeWidth={1.5} />
                        </div>

                        <h2 className="font-display text-2xl text-white mb-2">Bid submitted</h2>
                        <p className="font-sans text-sm text-[#B5B8C1] mb-8 px-4">
                            Your bid is encrypted and cannot be viewed until reveal.
                        </p>

                        <div className="w-full bg-[#1A1C22] p-4 rounded-sm border border-[#24262D] text-left mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-[#B5B8C1] uppercase tracking-wider">Auction</span>
                                <span className="text-sm text-white">Meridian Bond 004</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-[#B5B8C1] uppercase tracking-wider">Submitted</span>
                                <span className="text-sm text-white">Just now</span>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#24262D]">
                                <span className="text-xs text-[#B5B8C1] font-mono">Ref: 0x7a3f...9c21</span>
                                <button
                                    className="flex items-center gap-1 text-xs text-white hover:text-[#EDEDED]"
                                    onClick={() => addToast("Reference copied", "neutral")}
                                >
                                    <Copy size={12} /> Copy
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="text-sm text-[#B5B8C1] hover:text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </Modal>

            </div>
        </main>
    );
}

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const Step = ({ number, title, isActive, isCompleted, children }: { number: number, title: string, isActive: boolean, isCompleted: boolean, children: React.ReactNode }) => {
    return (
        <div className={`transition-all duration-500 ease-in-out border-l border-[#333333] pl-12 pb-24 relative ${isActive ? "opacity-100" : isCompleted ? "opacity-30" : "opacity-10 pointer-events-none"}`}>

            {/* Step Indicator */}
            <div
                className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full transition-all duration-500 
                ${isActive ? "bg-white scale-100" : isCompleted ? "bg-[#888888] scale-100" : "bg-[#333333] scale-75"}`}
            />

            <h2 className="font-display italic text-3xl md:text-4xl mb-12 transition-all duration-500 text-white">{title}</h2>

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isActive ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
                {children}
            </div>
        </div>
    );
};

export default function CreateAuctionPage() {
    const [step, setStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [nftSelected, setNftSelected] = useState(false);
    const [minimumPrice, setMinimumPrice] = useState("");
    const [deadline, setDeadline] = useState("");
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const canProceedToStep2 = nftSelected;
    const canProceedToStep3 = minimumPrice && deadline;
    const canProceedToStep4 = true; // All previous steps valid

    const nextStep = () => {
        if (step === 1 && canProceedToStep2) setStep(2);
        else if (step === 2 && canProceedToStep3) setStep(3);
        else if (step === 3 && canProceedToStep4) setStep(4);
    };

    return (
        <main className="min-h-screen px-6 md:px-12 pt-32 md:pt-40 max-w-3xl mx-auto animate-fade-in custom-scrollbar">
            <h1 className="font-display italic text-5xl md:text-6xl mb-24 opacity-0 animate-rise-up text-white">Create Auction</h1>

            <div className="flex flex-col opacity-0 animate-fade-in-delayed delay-150">

                {/* Step 1: Select NFT */}
                <Step number={1} title="Select NFT" isActive={step === 1} isCompleted={step > 1}>
                    <div className="space-y-12">
                        <div
                            onClick={() => setNftSelected(!nftSelected)}
                            className={`
                                aspect-square md:aspect-video w-full border transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4
                                ${nftSelected
                                    ? "border-white bg-[#111]"
                                    : "border-[#333333] hover:border-[#666] bg-transparent hover:bg-[#111]"}
                            `}
                        >
                            {nftSelected ? (
                                <>
                                    <div className="w-24 h-24 border border-white flex items-center justify-center font-mono text-xs text-white">
                                        PREVIEW
                                    </div>
                                    <span className="font-mono text-xs text-white uppercase tracking-widest">Selected</span>
                                </>
                            ) : (
                                <span className="font-mono text-xs text-[#666] uppercase tracking-widest">Click to Select Asset</span>
                            )}
                        </div>
                        <button
                            onClick={nextStep}
                            disabled={!canProceedToStep2}
                            className={`
                                w-full py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 border border-transparent
                                ${canProceedToStep2
                                    ? "bg-white text-black hover:bg-black hover:text-white hover:border-white"
                                    : "bg-[#222] text-[#555] cursor-not-allowed"}
                            `}
                        >
                            Continue
                        </button>
                    </div>
                </Step>

                {/* Step 2: Minimum Price */}
                <Step number={2} title="Minimum Price" isActive={step === 2} isCompleted={step > 2}>
                    <div className="space-y-12">
                        <div className="relative group">
                            <label
                                htmlFor="price-input"
                                className={`
                                    absolute -top-6 left-0 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200
                                    ${focusedInput === 'price' || minimumPrice ? "text-white" : "text-[#666]"}
                                `}
                            >
                                Minimum Price (SOL)
                            </label>
                            <input
                                id="price-input"
                                type="number"
                                value={minimumPrice}
                                onChange={(e) => setMinimumPrice(e.target.value)}
                                onFocus={() => setFocusedInput('price')}
                                onBlur={() => setFocusedInput(null)}
                                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                placeholder="0.00"
                                className="
                                    w-full bg-transparent border-b border-[#333333] py-4 text-3xl font-mono text-white placeholder-[#222]
                                    focus:outline-none focus:border-white transition-colors duration-200 rounded-none caret-white
                                "
                            />
                        </div>

                        <div className="flex gap-6">
                            <button onClick={() => setStep(1)} className="px-6 py-4 font-mono text-xs text-[#666] hover:text-white uppercase tracking-widest transition-colors">
                                Back
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!minimumPrice} // Simple validation
                                className={`
                                    flex-1 py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 border border-transparent
                                    ${minimumPrice
                                        ? "bg-white text-black hover:bg-black hover:text-white hover:border-white"
                                        : "bg-[#222] text-[#555] cursor-not-allowed"}
                                `}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </Step>

                {/* Step 3: Deadline */}
                <Step number={3} title="Deadline" isActive={step === 3} isCompleted={step > 3}>
                    <div className="space-y-12">
                        <div className="relative group">
                            <label
                                htmlFor="deadline-input"
                                className={`
                                    absolute -top-6 left-0 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200
                                    ${focusedInput === 'deadline' || deadline ? "text-white" : "text-[#666]"}
                                `}
                            >
                                Auction Duration
                            </label>
                            <input
                                id="deadline-input"
                                type="text"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                onFocus={() => setFocusedInput('deadline')}
                                onBlur={() => setFocusedInput(null)}
                                placeholder="e.g. 24h"
                                className="
                                    w-full bg-transparent border-b border-[#333333] py-4 text-3xl font-mono text-white placeholder-[#222]
                                    focus:outline-none focus:border-white transition-colors duration-200 rounded-none caret-white
                                "
                            />
                        </div>

                        <div className="flex gap-6">
                            <button onClick={() => setStep(2)} className="px-6 py-4 font-mono text-xs text-[#666] hover:text-white uppercase tracking-widest transition-colors">
                                Back
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!deadline}
                                className={`
                                    flex-1 py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 border border-transparent
                                    ${deadline
                                        ? "bg-white text-black hover:bg-black hover:text-white hover:border-white"
                                        : "bg-[#222] text-[#555] cursor-not-allowed"}
                                `}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </Step>

                {/* Step 4: Confirm Escrow Lock */}
                <Step number={4} title="Confirm Escrow Lock" isActive={step === 4} isCompleted={false}>
                    <div className="space-y-12">
                        <p className="font-sans text-[#888] leading-relaxed max-w-lg">
                            This action will cryptographically lock your asset into the escrow contract.
                            Parameters cannot be modified once signed.
                        </p>

                        <div className="border-l-2 border-white pl-6 py-2 space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Asset</span>
                                <span className="font-display text-xl text-white">Selected Asset #001</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Reserve Price</span>
                                <span className="font-mono text-lg text-white">{minimumPrice || "0.00"} SOL</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Duration</span>
                                <span className="font-mono text-lg text-white">{deadline || "--"}</span>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <button onClick={() => setStep(3)} className="px-6 py-4 font-mono text-xs text-[#666] hover:text-white uppercase tracking-widest transition-colors">
                                Back
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="
                                    flex-1 py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 
                                    bg-white text-black hover:bg-[#EEE] border border-white
                                "
                            >
                                Upload & Lock
                            </button>
                        </div>
                    </div>
                </Step>

            </div>

            {/* Confirmation Modal - Minimalist */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
                    style={{ backgroundColor: 'rgba(5, 5, 5, 0.9)' }}
                    onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                >
                    <div
                        className="bg-[#050505] border border-[#333333] p-12 max-w-md w-full animate-rise-up shadow-2xl relative"
                    >
                        <h3 className="font-display text-3xl mb-4 text-white">Initialize Auction</h3>
                        <p className="font-sans text-[#888] mb-12 text-sm leading-relaxed">
                            You are about to sign a transaction to approve the escrow contract transfer.
                            Gas fees will apply.
                        </p>
                        <div className="flex flex-col gap-4">
                            <button
                                className="w-full py-4 bg-white text-black font-mono text-xs uppercase tracking-widest hover:bg-[#DDD] transition-colors"
                                onClick={() => { setIsModalOpen(false); }}
                            >
                                Confirm Signature
                            </button>
                            <button
                                className="w-full py-4 bg-transparent text-[#666] hover:text-white font-mono text-xs uppercase tracking-widest transition-colors border border-transparent hover:border-[#333]"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}

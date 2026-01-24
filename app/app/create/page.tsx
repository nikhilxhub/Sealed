"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/ui/input-with-label";

export default function CreateAuctionPage() {
    const [step, setStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [nftSelected, setNftSelected] = useState(false);
    const [minimumPrice, setMinimumPrice] = useState("");
    const [deadline, setDeadline] = useState("");

    const canProceedToStep2 = nftSelected;
    const canProceedToStep3 = minimumPrice && deadline;
    const canProceedToStep4 = true; // All previous steps valid

    const nextStep = () => {
        if (step === 1 && canProceedToStep2) setStep(2);
        else if (step === 2 && canProceedToStep3) setStep(3);
        else if (step === 3 && canProceedToStep4) setStep(4);
    };

    const Step = ({ number, title, isActive, isCompleted, children }: { number: number, title: string, isActive: boolean, isCompleted: boolean, children: React.ReactNode }) => {
        return (
            <div className={`transition-all duration-320 ease-in-out border-l border-foreground/10 pl-8 pb-16 relative ${isActive ? "opacity-100" : isCompleted ? "opacity-40" : "opacity-20 pointer-events-none"}`}>

                {/* Step Indicator */}
                <div className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full transition-colors duration-320 ${isActive ? "bg-foreground" : isCompleted ? "bg-foreground/30" : "bg-foreground/10"}`} />

                <h2 className="font-display text-2xl mb-8 transition-all duration-320">{title}</h2>

                <div className={`transition-all duration-320 ease-in-out overflow-hidden ${isActive ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                    {children}
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-2xl mx-auto pt-24">
            <h1 className="font-display text-5xl mb-20 opacity-0 animate-rise-up">Create Auction</h1>

            <div className="flex flex-col opacity-0 animate-fade-in-delayed delay-150">

                {/* Step 1: Select NFT */}
                <Step number={1} title="Select NFT" isActive={step === 1} isCompleted={step > 1}>
                    <div className="space-y-8">
                        <div 
                            onClick={() => setNftSelected(!nftSelected)}
                            className={`border ${nftSelected ? "border-foreground/30 bg-foreground/5" : "border-foreground/10"} h-48 flex flex-col items-center justify-center text-foreground/40 font-sans text-sm cursor-pointer transition-all duration-240 hover:border-foreground/20`}
                        >
                            {nftSelected ? (
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-foreground/10 mx-auto flex items-center justify-center font-mono text-xs">NFT</div>
                                    <span className="block text-xs">Selected</span>
                                </div>
                            ) : (
                                <span className="text-xs uppercase tracking-wider">Click to Select NFT</span>
                            )}
                        </div>
                        <Button 
                            onClick={nextStep} 
                            disabled={!canProceedToStep2}
                            className="w-full"
                        >
                            Continue
                        </Button>
                    </div>
                </Step>

                {/* Step 2: Minimum Price */}
                <Step number={2} title="Minimum Price" isActive={step === 2} isCompleted={step > 2}>
                    <div className="space-y-8">
                        <InputWithLabel 
                            label="Minimum Price (ETH)" 
                            value={minimumPrice} 
                            onChange={(e) => setMinimumPrice(e.target.value)} 
                            type="number"
                            min="0"
                            step="0.01"
                        />
                        <div className="flex gap-4 pt-4">
                            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Back</Button>
                            <Button 
                                onClick={nextStep} 
                                disabled={!canProceedToStep3}
                                className="flex-1"
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                </Step>

                {/* Step 3: Deadline */}
                <Step number={3} title="Deadline" isActive={step === 3} isCompleted={step > 3}>
                    <div className="space-y-8">
                        <InputWithLabel 
                            label="Auction Duration" 
                            value={deadline} 
                            onChange={(e) => setDeadline(e.target.value)} 
                            placeholder="e.g., 24 hours"
                        />
                        <div className="flex gap-4 pt-4">
                            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Back</Button>
                            <Button 
                                onClick={nextStep} 
                                disabled={!canProceedToStep4}
                                className="flex-1"
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                </Step>

                {/* Step 4: Confirm Escrow Lock */}
                <Step number={4} title="Confirm Escrow Lock" isActive={step === 4} isCompleted={false}>
                    <div className="space-y-8">
                        <p className="font-sans text-foreground/60 leading-relaxed text-base">
                            This action will lock your NFT into escrow. The auction parameters cannot be modified after confirmation.
                        </p>

                        <div className="bg-foreground/5 border border-foreground/10 p-6 space-y-3 font-sans text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/60">NFT:</span> 
                                <span className="text-foreground/90">Selected</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/60">Minimum Price:</span> 
                                <span className="text-foreground/90">{minimumPrice} ETH</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-foreground/60">Deadline:</span> 
                                <span className="text-foreground/90">{deadline}</span>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">Back</Button>
                            <Button 
                                onClick={() => setIsModalOpen(true)} 
                                variant="destructive"
                                className="flex-1 bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"
                            >
                                Lock Escrow
                            </Button>
                        </div>
                    </div>
                </Step>

            </div>

            {/* Confirmation Modal - Darker than background */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
                    onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                >
                    <div 
                        className="bg-[#050505] border border-foreground/10 p-8 md:p-12 max-w-md w-full animate-rise-up"
                        style={{ backgroundColor: '#050505' }}
                    >
                        <h3 className="font-display text-2xl mb-6 text-foreground">Confirm Lock</h3>
                        <p className="font-sans text-foreground/60 mb-8 leading-relaxed text-sm">
                            This action is irreversible. Your NFT will be locked in escrow and the auction will begin immediately.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button 
                                className="w-full bg-foreground text-background hover:bg-foreground/90" 
                                onClick={() => { 
                                    setIsModalOpen(false); 
                                    // Mock: Auction Created
                                }}
                            >
                                Confirm
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full" 
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/ui/input-with-label";

export default function CreateAuctionPage() {
    const [step, setStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [assetName, setAssetName] = useState("");
    const [reservePrice, setReservePrice] = useState("");

    const nextStep = () => {
        setStep(prev => prev + 1);
    };

    const Step = ({ number, title, isActive, isCompleted, children }: { number: number, title: string, isActive: boolean, isCompleted: boolean, children: React.ReactNode }) => {
        return (
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-l border-foreground/10 pl-8 pb-12 relative ${isActive ? "opacity-100" : isCompleted ? "opacity-30" : "opacity-30 pointer-events-none"}`}>

                {/* Step Indicator */}
                <div className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full transition-colors duration-500 ${isActive ? "bg-foreground" : "bg-foreground/20"}`} />

                <h2 className="font-display text-2xl mb-6 transition-all duration-300">{title}</h2>

                <div className={`transition-all duration-500 overflow-hidden ${isActive ? "max-h-[500px] opacity-100" : isCompleted ? "max-h-0 opacity-0" : "max-h-0 opacity-0"}`}>
                    {children}
                </div>

                {isCompleted && (
                    <div className="absolute top-1 right-0 text-sm font-mono text-foreground">Completed</div>
                )}
            </div>
        );
    };

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-3xl mx-auto pt-24">
            <h1 className="font-display text-5xl mb-16 opacity-0 animate-rise-up">Issue New Asset</h1>

            <div className="flex flex-col opacity-0 animate-fade-in delay-150">

                {/* Step 1 */}
                <Step number={1} title="Asset Definition" isActive={step === 1} isCompleted={step > 1}>
                    <div className="space-y-8">
                        <InputWithLabel label="Asset Name" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
                        <div className="border border-dashed border-foreground/20 h-32 flex items-center justify-center text-foreground/40 font-mono text-sm uppercase tracking-widest hover:bg-foreground/5 transition-colors cursor-pointer">
                            Upload Token Metadata
                        </div>
                        <Button onClick={nextStep} disabled={!assetName}>Continue to Parameters</Button>
                    </div>
                </Step>

                {/* Step 2 */}
                <Step number={2} title="Auction Parameters" isActive={step === 2} isCompleted={step > 2}>
                    <div className="space-y-8">
                        <InputWithLabel label="Reserve Price (ETH)" value={reservePrice} onChange={(e) => setReservePrice(e.target.value)} type="number" />
                        <div className="flex gap-4">
                            {/* Mock Selects */}
                            <div className="flex-1 border-b border-foreground/20 py-4 text-foreground/60 font-sans cursor-pointer">24 Hours</div>
                            <div className="flex-1 border-b border-foreground/20 py-4 text-foreground/60 font-sans cursor-pointer">Blind Auction</div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={nextStep} disabled={!reservePrice}>Review & Lock</Button>
                        </div>
                    </div>
                </Step>

                {/* Step 3 */}
                <Step number={3} title="Encryption & Issue" isActive={step === 3} isCompleted={step > 3}>
                    <div className="space-y-8">
                        <p className="font-sans text-foreground/60 leading-relaxed">
                            You are about to cryptographically lock this asset into a smart contract.
                            Once issued, the parameters cannot be modified.
                        </p>

                        <div className="bg-foreground/5 p-6 space-y-2 font-mono text-sm">
                            <div className="flex justify-between"><span>Asset:</span> <span>{assetName}</span></div>
                            <div className="flex justify-between"><span>Reserve:</span> <span>{reservePrice} ETH</span></div>
                            <div className="flex justify-between"><span>Type:</span> <span>Blind / 24h</span></div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                            <Button onClick={() => setIsModalOpen(true)} variant="destructive" className="bg-red-900/20 text-red-200 border-red-900/50 hover:bg-red-900/40 hover:border-red-500">
                                Confirm Issuance
                            </Button>
                        </div>
                    </div>
                </Step>

            </div>

            {/* Confirmation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0a0a0a] border border-foreground/10 p-8 md:p-12 max-w-md w-full shadow-2xl animate-rise-up">
                        <h3 className="font-display text-3xl mb-4 text-red-500/90">Irreversible Action</h3>
                        <p className="font-sans text-foreground/60 mb-8 leading-relaxed">
                            This will permanently deploy the auction contract. Gas fees will be deducted immediately. This cannot be undone.
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={() => { setIsModalOpen(false); alert("Mock: Auction Created"); }}>Sign & Deploy</Button>
                            <Button variant="ghost" className="w-full" onClick={() => setIsModalOpen(false)}>Cancel Application</Button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}

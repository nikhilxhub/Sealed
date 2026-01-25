"use client";

import React, { useEffect, useRef, useState } from "react";

const STEPS = [
    {
        id: 1,
        title: "Lock NFT",
        description: "The seller defines auction parameters and locks the NFT into escrow. The asset is cryptographically secured before bidding begins.",
        diagram: (
            <svg width="100%" height="120" viewBox="0 0 400 120" className="opacity-50">
                <rect x="50" y="40" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M120 60 L280 60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <rect x="280" y="40" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        id: 2,
        title: "Submit Encrypted Bids",
        description: "Bidders place encrypted bids into the contract. The bid amount is hidden using a commit-reveal scheme. No information is leaked during the bidding period.",
        diagram: (
            <svg width="100%" height="120" viewBox="0 0 400 120" className="opacity-50">
                <circle cx="50" cy="30" r="4" fill="currentColor" />
                <circle cx="50" cy="60" r="4" fill="currentColor" />
                <circle cx="50" cy="90" r="4" fill="currentColor" />
                <path d="M70 60 L320 60" stroke="currentColor" strokeWidth="1.5" />
                <rect x="320" y="40" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        id: 3,
        title: "Reveal Winner",
        description: "Once the auction expires, all bids are revealed. The contract identifies the highest bidder and prepares for settlement.",
        diagram: (
            <svg width="100%" height="120" viewBox="0 0 400 120" className="opacity-50">
                <rect x="160" y="20" width="60" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M160 60 L50 60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M220 60 L350 60" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        id: 4,
        title: "Automatic Settlement",
        description: "Funds are transferred to the seller, the NFT is released to the winner, and losing bids are automatically refunded. The process is trustless and irreversible.",
        diagram: (
            <svg width="100%" height="120" viewBox="0 0 400 120" className="opacity-50">
                <rect x="50" y="40" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M120 60 L180 60" stroke="currentColor" strokeWidth="1.5" />
                <rect x="180" y="40" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M240 60 L290 60" stroke="currentColor" strokeWidth="1.5" />
                <rect x="290" y="40" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
];

export default function HowItWorksPage() {
    const [activeStep, setActiveStep] = useState(1);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute("data-index"));
                        setActiveStep(index);
                    }
                });
            },
            { rootMargin: "-30% 0px -30% 0px", threshold: 0.6 }
        );

        stepRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <main className="min-h-screen px-6 md:px-12 pt-32 md:pt-30 max-w-4xl mx-auto">
            <header className="mb-24 opacity-0 animate-fade-in">
                <h1 className="font-display text-5xl mb-6">How It Works</h1>
                <p className="font-sans text-foreground/60 max-w-xl text-lg leading-relaxed">
                    The Sealed Bid protocol ensures market integrity by removing information asymmetry.
                    Explain without flexing.
                </p>
            </header>

            <div className="relative border-l border-foreground/10 ml-4 md:ml-0 pl-12 md:pl-24 space-y-40 pb-40">
                {STEPS.map((step, i) => (
                    <div
                        key={step.id}
                        ref={(el) => { stepRefs.current[i] = el; }}
                        data-index={step.id}
                        className={`transition-all duration-400 ease-in-out ${activeStep === step.id
                            ? "opacity-100 translate-y-0"
                            : activeStep > step.id
                                ? "opacity-30 translate-y-0"
                                : "opacity-20 translate-y-4 pointer-events-none"
                            }`}
                    >
                        <div
                            className="absolute -left-[calc(3rem+5px)] md:-left-[calc(6rem+5px)] w-[9px] h-[9px] rounded-full bg-foreground mt-2 transition-opacity duration-400"
                            style={{ opacity: activeStep === step.id ? 1 : activeStep > step.id ? 0.3 : 0.1 }}
                        />

                        <h3 className="font-display text-3xl mb-6">{step.title}</h3>
                        <p className="font-sans text-foreground/70 mb-10 max-w-lg leading-relaxed text-base">
                            {step.description}
                        </p>

                        <div className="max-w-lg border-t border-b border-foreground/10 py-10">
                            {step.diagram}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

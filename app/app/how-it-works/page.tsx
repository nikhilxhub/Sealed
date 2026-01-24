"use client";

import React, { useEffect, useRef, useState } from "react";

const STEPS = [
    {
        id: 1,
        title: "Asset Encryption",
        description: "The seller defines auction parameters. A symmetric key is generated locally. The asset metadata is encrypted client-side before ever touching the network.",
        diagram: (
            <svg width="100%" height="100" viewBox="0 0 400 100" className="opacity-60">
                <rect x="50" y="30" width="40" height="40" fill="none" stroke="currentColor" />
                <path d="M100 50 L300 50" stroke="currentColor" strokeDasharray="4 4" />
                <circle cx="350" cy="50" r="20" fill="none" stroke="currentColor" />
            </svg>
        )
    },
    {
        id: 2,
        title: "Blind Bidding",
        description: "Bidders place value into the contract. The bid amount is hidden using a commit-reveal scheme. Proof of funds is verified without revealing the specific amount to other observers.",
        diagram: (
            <svg width="100%" height="100" viewBox="0 0 400 100" className="opacity-60">
                <circle cx="50" cy="20" r="5" fill="currentColor" />
                <circle cx="50" cy="50" r="5" fill="currentColor" />
                <circle cx="50" cy="80" r="5" fill="currentColor" />
                <path d="M80 50 L320 50" stroke="currentColor" />
                <rect x="340" y="30" width="40" height="40" fill="none" stroke="currentColor" />
            </svg>
        )
    },
    {
        id: 3,
        title: "Settlement",
        description: "Once the auction expires, the contract decrypts the highest bid. Funds are transferred, the asset is released, and losing bids are unsealed for withdrawal.",
        diagram: (
            <svg width="100%" height="100" viewBox="0 0 400 100" className="opacity-60">
                <rect x="180" y="10" width="40" height="80" fill="none" stroke="currentColor" />
                <path d="M180 50 L50 50" stroke="currentColor" strokeDasharray="4 4" />
                <path d="M220 50 L350 50" stroke="currentColor" />
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
            { rootMargin: "-20% 0px -50% 0px", threshold: 0.5 }
        );

        stepRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto pt-24">
            <header className="mb-24 opacity-0 animate-fade-in">
                <h1 className="font-display text-5xl mb-6">Protocol Flow</h1>
                <p className="font-sans text-foreground/60 max-w-xl text-lg leading-relaxed">
                    The Sealed Bid protocol ensures market integrity by removing information asymmetry.
                    Here is how the trustless mechanism operates.
                </p>
            </header>

            <div className="relative border-l border-foreground/10 ml-4 md:ml-0 pl-12 md:pl-24 space-y-32 pb-32">
                {STEPS.map((step, i) => (
                    <div
                        key={step.id}
                        ref={(el) => { stepRefs.current[i] = el; }}
                        data-index={step.id}
                        className={`transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${activeStep === step.id ? "opacity-100 blur-0 translate-x-0" : "opacity-20 blur-[1px] translate-x-4"
                            }`}
                    >
                        <div className="absolute -left-[5px] w-[9px] h-[9px] rounded-full bg-foreground mt-2"
                            style={{ opacity: activeStep === step.id ? 1 : 0.1 }}
                        />

                        <h3 className="font-display text-3xl mb-4">{step.title}</h3>
                        <p className="font-sans text-foreground/80 mb-8 max-w-md leading-relaxed text-lg">
                            {step.description}
                        </p>

                        <div className="max-w-md border-t border-b border-foreground/10 py-8">
                            {step.diagram}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

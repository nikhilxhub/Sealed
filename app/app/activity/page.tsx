"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

// Mock Data (Empty for First Visit Experience)
// const ACTIVITY_DATA = [ ... ];
const ACTIVITY_DATA: Array<{ id: string, type: string, asset: string, status: string, time: string }> = [];

export default function ActivityPage() {
    return (
        <main className="min-h-screen p-6 md:p-12 max-w-[1200px] mx-auto pt-24 animate-fade-in">
            <div className="mb-16">
                <h1 className="font-display text-4xl text-white mb-3">My Activity</h1>
                <p className="font-sans text-[#B5B8C1] text-sm">
                    Observational record of your auction interactions.
                </p>
            </div>

            <div className="w-full font-sans">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-[#24262D] text-[#B5B8C1] font-mono text-xs uppercase tracking-widest opacity-60">
                    <div className="col-span-2">Type</div>
                    <div className="col-span-5">Asset</div>
                    <div className="col-span-4">Status</div>
                    <div className="col-span-1 text-right">Time</div>
                </div>

                {/* Content */}
                {ACTIVITY_DATA.length > 0 ? (
                    <div className="opacity-0 animate-fade-in-delayed delay-150">
                        {ACTIVITY_DATA.map((item, index) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-12 gap-4 py-6 border-b border-[#24262D] items-center hover:bg-[#1A1C22] transition-colors duration-240"
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                <div className="col-span-2 text-[#B5B8C1] text-sm">{item.type}</div>
                                <div className="col-span-5 font-display text-lg text-white">{item.asset}</div>
                                <div className="col-span-4 text-[#B5B8C1] text-sm font-sans">{item.status}</div>
                                <div className="col-span-1 text-right text-[#B5B8C1] font-mono text-xs">{item.time}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Initial Onboarding / Empty State */
                    <div className="py-24 text-center animate-fade-in-slow">
                        <h3 className="font-display text-xl text-white mb-2">No activity yet</h3>
                        <p className="font-sans text-[#B5B8C1] mb-8">
                            Place your first bid or create an auction to begin.
                        </p>
                        <Link
                            href="/explore"
                            className="text-[#EDEDED] hover:text-white hover:underline decoration-1 underline-offset-4 font-medium transition-colors"
                        >
                            Explore auctions &rarr;
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}

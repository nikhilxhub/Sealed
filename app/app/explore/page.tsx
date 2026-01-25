"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";

// Mock Data
const MOCK_AUCTIONS = [
    { id: "1", title: "Meridian Bond 004", price: "45.00 SOL", endsIn: "2h 45m", status: "live", priceVal: 45 },
    { id: "2", title: "Archive Key #882", price: "12.50 SOL", endsIn: "6h 15m", status: "live", priceVal: 12.5 },
    { id: "3", title: "Stellar Drift Alpha", price: "8.20 SOL", endsIn: "12h 00m", status: "upcoming", priceVal: 8.2 },
    { id: "4", title: "Obsidian Shard", price: "155.00 SOL", endsIn: "1d 04h", status: "live", priceVal: 155 },
    { id: "5", title: "Genesis Block", price: "-", endsIn: "Ended", status: "ended", priceVal: 0 },
];

export default function ExplorePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [timeFilter, setTimeFilter] = useState("all");

    // Filter Logic
    const filteredAuctions = useMemo(() => {
        return MOCK_AUCTIONS.filter(auction => {
            // Search
            if (searchQuery && !auction.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            // Status
            if (statusFilter !== "all" && auction.status !== statusFilter) {
                return false;
            }
            // Price (Simple logic for demo)
            if (priceFilter === "low" && auction.priceVal > 10) return false;
            if (priceFilter === "high" && auction.priceVal <= 50) return false;

            return true;
        });
    }, [searchQuery, statusFilter, priceFilter]);

    const handleClearFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setPriceFilter("all");
        setTimeFilter("all");
    };

    return (
        <main className="min-h-screen px-6 md:px-12 pt-32 md:pt-30 max-w-[1200px] mx-auto animate-fade-in">
            {/* Header with Search & Filter - Redesigned */}
            <div className="flex flex-col gap-8 mb-16">
                <div className="flex flex-col gap-2">
                    <h1 className="font-display font-serif text-5xl text-white">Explore Auctions</h1>
                    <p className="font-sans text-[#B5B8C1] max-w-lg">
                        Discover and bid on sealed-bid financial instruments.
                    </p>
                </div>

                {/* Unified Control Bar */}
                <div className="w-full bg-[#15171C] border border-[#24262D] p-1 rounded-sm flex flex-col md:flex-row gap-0 md:items-center">

                    {/* Search - High Affordance */}
                    <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6E76] group-focus-within:text-white transition-colors duration-200">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title or creator..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="
                                w-full bg-transparent border-none py-4 pl-12 pr-10
                                text-white placeholder-[#6B6E76] 
                                focus:ring-0 focus:outline-none focus:placeholder-white/50
                                transition-all
                            "
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6E76] hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Divider (Desktop Only) */}
                    <div className="hidden md:block w-[1px] h-8 bg-[#24262D] mx-2" />

                    {/* Filter Group */}
                    <div className="flex flex-wrap md:flex-nowrap gap-2 p-2 md:p-0">
                        <div className="w-full md:w-40">
                            <Dropdown
                                options={[
                                    { label: "All Status", value: "all" },
                                    { label: "Live Only", value: "live" },
                                    { label: "Upcoming", value: "upcoming" },
                                    { label: "Ended", value: "ended" }
                                ]}
                                value={statusFilter}
                                onChange={setStatusFilter}
                            />
                        </div>
                        <div className="w-full md:w-36">
                            <Dropdown
                                options={[
                                    { label: "Any Price", value: "all" },
                                    { label: "< 10 SOL", value: "low" },
                                    { label: "> 50 SOL", value: "high" }
                                ]}
                                value={priceFilter}
                                onChange={setPriceFilter}
                            />
                        </div>
                        <div className="w-full md:w-36">
                            <Dropdown
                                options={[
                                    { label: "Any Time", value: "all" },
                                    { label: "Ending Soon", value: "soon" }
                                ]}
                                value={timeFilter}
                                onChange={setTimeFilter}
                            />
                        </div>
                    </div>
                </div>

                {/* Active Filter Clear (Attached below) */}
                {(statusFilter !== "all" || priceFilter !== "all" || timeFilter !== "all" || searchQuery) && (
                    <div className="flex justify-end -mt-4 pr-1">
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-[#B5B8C1] hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <X size={12} /> Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Results Grid */}
            <div className="flex flex-col gap-0 w-full min-h-[400px]">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[#24262D] text-xs font-mono text-[#B5B8C1] uppercase tracking-wider opacity-60">
                    <div className="col-span-6 md:col-span-5">Asset</div>
                    <div className="col-span-3 text-right">Minimum Bid</div>
                    <div className="col-span-3 md:col-span-2 text-right">Ending</div>
                </div>

                {/* Rows or Empty State */}
                <div className="transition-opacity duration-200">
                    {filteredAuctions.length > 0 ? (
                        filteredAuctions.map((auction, i) => (
                            <Link
                                key={auction.id}
                                href={`/auctions/${auction.id}`}
                                className="group grid grid-cols-12 gap-4 px-4 py-8 border-b border-[#24262D] items-center transition-all duration-300 hover:bg-[#1A1C22]"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className="col-span-6 md:col-span-5 font-display text-2xl text-white group-hover:pl-2 transition-all duration-300">
                                    {auction.title}
                                </div>
                                <div className="col-span-3 text-right font-sans text-[#EDEDED]/80">
                                    {auction.price}
                                </div>
                                <div className="col-span-3 md:col-span-2 text-right font-sans text-[#B5B8C1] tabular-nums">
                                    {auction.endsIn}
                                </div>
                                <div className="col-span-0 md:col-span-2 hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs uppercase tracking-widest border-b border-white text-white">View</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
                            <p className="font-sans text-[#B5B8C1] mb-4">No auctions match your filters</p>
                            <button
                                onClick={handleClearFilters}
                                className="text-white hover:underline decoration-1 underline-offset-4 font-medium"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

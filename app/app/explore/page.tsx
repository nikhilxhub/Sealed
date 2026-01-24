"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";

// Mock Data
const MOCK_AUCTIONS = [
    { id: "1", title: "Meridian Bond 004", price: "45.00 ETH", endsIn: "2h 45m", status: "live", priceVal: 45 },
    { id: "2", title: "Archive Key #882", price: "12.50 ETH", endsIn: "6h 15m", status: "live", priceVal: 12.5 },
    { id: "3", title: "Stellar Drift Alpha", price: "8.20 ETH", endsIn: "12h 00m", status: "upcoming", priceVal: 8.2 },
    { id: "4", title: "Obsidian Shard", price: "155.00 ETH", endsIn: "1d 04h", status: "live", priceVal: 155 },
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
        <main className="min-h-screen p-6 md:p-12 max-w-[1200px] mx-auto animate-fade-in">
            {/* Header with Search & Filter */}
            <div className="flex flex-col gap-6 mb-12">
                <div className="flex justify-between items-end">
                    <h1 className="font-display text-4xl text-white">Explore</h1>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    {/* Search - Persistent at top */}
                    <div className="relative w-full md:max-w-md">
                        <input
                            type="text"
                            placeholder="Search by title or creator"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="
                                w-full bg-transparent border-b border-[#24262D] py-2 
                                text-white placeholder-[#B5B8C1] focus:border-white focus:outline-none transition-colors
                            "
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#B5B8C1] hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <div className="w-40">
                            <Dropdown
                                options={[
                                    { label: "All Status", value: "all" },
                                    { label: "Live", value: "live" },
                                    { label: "Upcoming", value: "upcoming" },
                                    { label: "Ended", value: "ended" }
                                ]}
                                value={statusFilter}
                                onChange={setStatusFilter}
                            />
                        </div>
                        <div className="w-40">
                            <Dropdown
                                options={[
                                    { label: "Any Price", value: "all" },
                                    { label: "< 10 ETH", value: "low" },
                                    { label: "> 50 ETH", value: "high" }
                                ]}
                                value={priceFilter}
                                onChange={setPriceFilter}
                            />
                        </div>
                        <div className="w-40">
                            <Dropdown
                                options={[
                                    { label: "Any Time", value: "all" },
                                    { label: "Ending Soon", value: "soon" }
                                ]}
                                value={timeFilter}
                                onChange={setTimeFilter}
                            />
                        </div>

                        {(statusFilter !== "all" || priceFilter !== "all" || timeFilter !== "all") && (
                            <button
                                onClick={handleClearFilters}
                                className="text-sm text-[#B5B8C1] hover:text-white underline decoration-1 underline-offset-4"
                            >
                                Reset all
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex flex-col gap-0 w-full min-h-[400px]">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[#24262D] text-xs font-mono text-[#B5B8C1] uppercase tracking-wider opacity-60">
                    <div className="col-span-6 md:col-span-5">Asset</div>
                    <div className="col-span-3 text-right">Current Bid</div>
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

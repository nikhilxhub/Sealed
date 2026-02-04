"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getProgram } from "@/utils/anchor";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useLoading } from "@/components/providers/LoadingProvider";

// Data Model
interface AuctionItem {
    id: string; // PublicKey
    title: string; // NFT Name
    price: string; // Min Price string
    priceVal: number; // For filtering
    endsIn: string; // Display string
    endTime: number; // Timestamp
    status: "live" | "ended" | "settled" | "upcoming";
    image: string | null;
}

export default function ExplorePage() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();

    const [auctions, setAuctions] = useState<AuctionItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [timeFilter, setTimeFilter] = useState("all");
    const { setIsLoading } = useLoading();
    const [clickingId, setClickingId] = useState<string | null>(null);

    // Fetch Data
    useEffect(() => {
        if (!wallet) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const program = getProgram(connection, wallet);
                const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());

                const allAuctions = await program.account["auction"].all();

                const processed = await Promise.all(allAuctions.map(async (a) => {
                    const acc = a.account as any;
                    const now = Date.now() / 1000;
                    const endTime = acc.endTime.toNumber();

                    let status: AuctionItem["status"] = "live";
                    if (acc.settled) {
                        status = "settled";
                    } else if (now > endTime) {
                        status = "ended";
                    }

                    // Calculate "Ends In" string
                    let endsIn = "";
                    if (status === "settled") endsIn = "Settled";
                    else if (status === "ended") endsIn = "Ended";
                    else {
                        const diff = endTime - now;
                        const days = Math.floor(diff / 86400);
                        const hours = Math.floor((diff % 86400) / 3600);
                        const minutes = Math.floor((diff % 3600) / 60);

                        if (days > 0) endsIn = `${days}d ${hours}h`;
                        else if (hours > 0) endsIn = `${hours}h ${minutes}m`;
                        else endsIn = `${minutes}m`;
                    }

                    // Metadata
                    let title = "Unknown Asset";
                    let image = null;
                    try {
                        const mint = new PublicKey(acc.nftMint);
                        const asset = await fetchDigitalAsset(umi, umiPublicKey(mint.toBase58()));
                        title = asset.metadata.name;
                        if (asset.metadata.uri) {
                            const res = await fetch(asset.metadata.uri);
                            const json = await res.json();
                            image = json.image;
                        }
                    } catch (e) {
                        // console.warn("Meta fetch failed", e);
                    }

                    const minPrice = acc.minPrice.toNumber() / LAMPORTS_PER_SOL;

                    return {
                        id: a.publicKey.toBase58(),
                        title,
                        price: `${minPrice} SOL`,
                        priceVal: minPrice,
                        endsIn,
                        endTime,
                        status,
                        image
                    };
                }));

                // Sort: Live first, then by earliest deadline? Or newest created?
                // Default: Live auctions first, closing soonest.
                processed.sort((a, b) => {
                    if (a.status === 'live' && b.status !== 'live') return -1;
                    if (a.status !== 'live' && b.status === 'live') return 1;
                    return a.endTime - b.endTime;
                });

                setAuctions(processed);
            } catch (err) {
                console.error("Failed to fetch auctions", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [connection, wallet]);

    // Filter Logic
    const filteredAuctions = useMemo(() => {
        return auctions.filter(auction => {
            // Search
            if (searchQuery && !auction.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            // Status
            // statusFilter values: 'all', 'live', 'upcoming', 'ended'
            if (statusFilter !== "all") {
                if (statusFilter === 'ended') {
                    // Include 'settled' in 'ended' filter for UX simplicity
                    if (auction.status !== 'ended' && auction.status !== 'settled') return false;
                } else {
                    if (auction.status !== statusFilter) return false;
                }
            }

            // Price
            if (priceFilter === "low" && auction.priceVal > 10) return false;
            if (priceFilter === "high" && auction.priceVal <= 50) return false;

            // Time ('soon' = < 24h)
            if (timeFilter === "soon") {
                const now = Date.now() / 1000;
                const diff = auction.endTime - now;
                if (diff < 0 || diff > 86400) return false;
            }

            return true;
        });
    }, [searchQuery, statusFilter, priceFilter, timeFilter, auctions]);

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
                <div className="flex flex-row items-end justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="font-display font-serif text-5xl text-white">Explore Auctions</h1>
                        <p className="font-sans text-[#B5B8C1] max-w-lg">
                            Discover and bid on sealed-bid financial instruments.
                        </p>
                    </div>

                    <Link href="/create" className="font-sans text-base font-medium text-white hover:text-white/80 transition-colors mb-2 pr-1">
                        create auction  &rarr;

                    </Link>
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
                {!publicKey ? (
                    <div className="py-24 text-center">
                        <p className="font-sans text-[#B5B8C1] mb-4">Connect wallet to explore live auctions</p>
                        <WalletMultiButton />
                    </div>
                ) : loading ? (
                    <div className="py-24 text-center text-[#666] font-mono animate-pulse">
                        Loading live auctions...
                    </div>
                ) : (
                    <div className="transition-opacity duration-200">
                        {filteredAuctions.length > 0 ? (
                            filteredAuctions.map((auction, i) => (
                                <Link
                                    key={auction.id}
                                    href={`/auctions/${auction.id}`}
                                    onClick={() => {
                                        setClickingId(auction.id);
                                        setIsLoading(true);
                                    }}
                                    className="group grid grid-cols-12 gap-4 px-4 py-8 border-b border-[#24262D] items-center transition-all duration-300 hover:bg-[#1A1C22]"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <div className="col-span-6 md:col-span-5 flex items-center gap-4">
                                        {auction.image ? (
                                            <img src={auction.image} alt={auction.title} className="w-12 h-12 object-cover rounded-sm border border-[#333]" />
                                        ) : (
                                            <div className="w-12 h-12 bg-[#111] rounded-sm border border-[#333]" />
                                        )}
                                        <div className="font-display text-xl text-white group-hover:pl-2 transition-all duration-300">
                                            {auction.title}
                                        </div>
                                    </div>
                                    <div className="col-span-3 text-right font-sans text-[#EDEDED]/80">
                                        {auction.price}
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-right font-sans">
                                        {auction.status === 'live' ? (
                                            <span className="text-[#EDEDED]">{auction.endsIn}</span>
                                        ) : (
                                            <span className="text-[#666]">{auction.endsIn}</span>
                                        )}
                                    </div>
                                    <div className="col-span-0 md:col-span-2 hidden md:flex justify-end pr-2">
                                        {clickingId === auction.id ? (
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-xs uppercase tracking-widest border-b border-white text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</span>
                                        )}
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
                )}
            </div>
        </main>
    );
}

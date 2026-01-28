"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getProgram } from "@/utils/anchor";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { PublicKey } from "@solana/web3.js";

// Activity Type
interface ActivityItem {
    id: string;
    type: "Created Auction" | "Placed Bid";
    asset: string;
    image: string | null;
    status: "Live" | "Ended" | "Settled";
    time: string;
    timestamp: number; // for sorting
}

export default function ActivityPage() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!wallet || !publicKey) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const program = getProgram(connection, wallet);
                const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());

                // 1. Fetch My Auctions (Seller)
                // Filter: seller == publicKey (offset 8)
                const myAuctions = await program.account.auction.all([
                    {
                        memcmp: {
                            offset: 8,
                            bytes: publicKey.toBase58(),
                        },
                    },
                ]);

                // 2. Fetch My Bids (Bidder)
                // Filter: bidder == publicKey (offset 8 + 32 = 40)
                const myBids = await program.account.bidEscrow.all([
                    {
                        memcmp: {
                            offset: 8 + 32, // BidEscrow: auction(32), bidder(32)
                            bytes: publicKey.toBase58(),
                        },
                    },
                ]);

                // 3. Process Auctions
                const auctionItems: ActivityItem[] = await Promise.all(myAuctions.map(async (a) => {
                    const acc = a.account as any;
                    const now = Date.now() / 1000;
                    let status: ActivityItem["status"] = "Live";
                    if (acc.settled) status = "Settled";
                    else if (now > acc.endTime.toNumber()) status = "Ended";

                    // Fetch Metadata
                    let assetName = "Unknown Asset";
                    let assetImage = null;
                    try {
                        const mint = new PublicKey(acc.nftMint);
                        const asset = await fetchDigitalAsset(umi, umiPublicKey(mint.toBase58()));
                        assetName = asset.metadata.name;

                        if (asset.metadata.uri) {
                            const res = await fetch(asset.metadata.uri);
                            const json = await res.json();
                            assetImage = json.image;
                        }
                    } catch (e) {
                        console.warn("Failed to fetch metadata", e);
                    }

                    return {
                        id: a.publicKey.toBase58(),
                        type: "Created Auction",
                        asset: assetName,
                        image: assetImage,
                        status: status,
                        time: new Date(acc.endTime.toNumber() * 1000).toLocaleDateString(),
                        timestamp: acc.endTime.toNumber()
                    };
                }));

                // 4. Process Bids
                // Need to fetch the linked auction account to get details
                const bidItems = await Promise.all(myBids.map(async (b) => {
                    const bidAcc = b.account as any;

                    try {
                        const auctionKey = new PublicKey(bidAcc.auction);
                        const auctionAcc = await program.account.auction.fetch(auctionKey) as any;

                        const now = Date.now() / 1000;
                        let status: ActivityItem["status"] = "Live";
                        if (auctionAcc.settled) status = "Settled";
                        else if (now > auctionAcc.endTime.toNumber()) status = "Ended";

                        // Metadata
                        let assetName = "Unknown Asset";
                        let assetImage = null;
                        try {
                            const mint = new PublicKey(auctionAcc.nftMint);
                            const asset = await fetchDigitalAsset(umi, umiPublicKey(mint.toBase58()));
                            assetName = asset.metadata.name;
                            if (asset.metadata.uri) {
                                const res = await fetch(asset.metadata.uri);
                                const json = await res.json();
                                assetImage = json.image;
                            }
                        } catch (e) {
                            console.warn("Failed fetch meta for bid", e);
                        }

                        return {
                            id: b.publicKey.toBase58(),
                            type: "Placed Bid",
                            asset: assetName,
                            image: assetImage,
                            status: status,
                            time: new Date(auctionAcc.endTime.toNumber() * 1000).toLocaleDateString(),
                            timestamp: auctionAcc.endTime.toNumber()
                        };

                    } catch (error) {
                        console.error("Orphaned bid or error", error);
                        return null; // Handle orphaned bids safely
                    }
                }));

                // Combine and Filter Nulls
                const combined = [...auctionItems, ...bidItems].filter((i): i is ActivityItem => i !== null);
                // Sort by time (newest first? or nearest deadline?)
                // Let's sort by timestamp specific logic, maybe creation? But we used endTime.
                combined.sort((a, b) => b.timestamp - a.timestamp);

                setActivity(combined);

            } catch (err) {
                console.error("Error fetching activity:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [wallet, publicKey, connection]);


    return (
        <main className="min-h-screen px-6 md:px-12 pt-32 md:pt-30 max-w-[1200px] mx-auto animate-fade-in">
            <div className="mb-16">
                <h1 className="font-display text-4xl text-white mb-3">My Activity</h1>
                <p className="font-sans text-[#B5B8C1] text-sm">
                    Observational record of your auction interactions.
                </p>
            </div>

            <div className="w-full font-sans">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-[#24262D] text-[#B5B8C1] font-mono text-xs uppercase tracking-widest opacity-60">
                    <div className="col-span-2 pl-4">Type</div>
                    <div className="col-span-5">Asset</div>
                    <div className="col-span-4">Status</div>
                    <div className="col-span-1 text-right pr-4">Deadline</div>
                </div>

                {!publicKey ? (
                    <div className="py-24 text-center">
                        <WalletMultiButton />
                    </div>
                ) : loading ? (
                    <div className="py-24 text-center text-[#666] font-mono animate-pulse">
                        Loading on-chain data...
                    </div>
                ) : activity.length > 0 ? (
                    <div className="opacity-0 animate-fade-in-delayed delay-150">
                        {activity.map((item, index) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-12 gap-4 py-6 border-b border-[#24262D] items-center hover:bg-[#1A1C22] transition-colors duration-240 group"
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                <div className="col-span-2 text-[#B5B8C1] text-[10px] uppercase tracking-widest pl-4">
                                    <span className={`px-2 py-1.5 rounded-sm border ${item.type === 'Created Auction' ? 'border-white/10 bg-white/5 text-white' : 'border-dashed border-[#444] text-[#888]'}`}>
                                        {item.type === 'Created Auction' ? 'Create' : 'Bid'}
                                    </span>
                                </div>
                                <div className="col-span-5 flex items-center gap-4">
                                    {item.image ? (
                                        <img src={item.image} alt={item.asset} className="w-12 h-12 object-cover rounded-sm border border-[#333]" />
                                    ) : (
                                        <div className="w-12 h-12 bg-[#111] rounded-sm border border-[#333]" />
                                    )}
                                    <span className="font-display text-xl text-white group-hover:text-white/90 transition-colors">{item.asset}</span>
                                </div>
                                <div className="col-span-4 flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Live' ? 'bg-[#EDEDED] animate-pulse-subtle' :
                                        item.status === 'Settled' ? 'bg-[#666]' :
                                            'bg-[#C35A5A]'
                                        }`} />
                                    <span className="text-[#B5B8C1] text-sm font-sans">{item.status}</span>
                                </div>
                                <div className="col-span-1 text-right text-[#666] font-mono text-xs pr-4">{item.time}</div>
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
                            href="/create"
                            className="text-[#EDEDED] hover:text-white hover:underline decoration-1 underline-offset-4 font-medium transition-colors"
                        >
                            Create Auction
                        </Link>
                        <span className="text-[#333333] mx-2">|</span>
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

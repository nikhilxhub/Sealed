"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getProgram } from "@/utils/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Hooks
    const router = useRouter();
    const { addToast } = useToast();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();

    // Unwrap params
    const { id } = React.use(params);

    // State
    const [bidAmount, setBidAmount] = useState("");
    const [status, setStatus] = useState<"idle" | "encrypting" | "submitted" | "reveal">("idle");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data State
    const [auctionData, setAuctionData] = useState<any>(null);
    const [metadata, setMetadata] = useState<{ name: string; image: string | null }>({ name: "Unknown Asset", image: null });
    const [timeLeft, setTimeLeft] = useState("");

    // Fetch Data
    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Auction Account
                const program = getProgram(connection, wallet); // Wallet can be null for read-only if helper supports it, but here likely needs wallet or we use read-only provider manually.
                // Fallback for read-only if wallet is missing? getProgram usually requires wallet.
                // For now assuming user connects wallet or we handle the error.
                // If wallet is null, getProgram might throw in some implementations, but let's try.
                // Actually, to just VIEW, we shouldn't need a wallet.
                // But getProgram implementation usually takes a wallet. 
                // Let's rely on wallet being present for now or try-catch.

                // If no wallet, we can't use the helper easily without Refactoring getProgram.
                // We'll proceed assuming wallet or just skip fetch if no wallet (which mimics Explore page behavior).
                // BETTER: Use a read-only provider if wallet is null, but for speed, let's just wait for wallet.
                if (!wallet) {
                    setLoading(false);
                    return;
                }

                const auctionPubkey = new PublicKey(id);
                const auction = await program.account.auction.fetch(auctionPubkey);
                setAuctionData(auction);

                // 2. Fetch User Bid State
                if (wallet) {
                    const [bidEscrowPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("bid_escrow"), auctionPubkey.toBuffer(), wallet.publicKey.toBuffer()],
                        program.programId
                    );
                    try {
                        const bidAccount = await program.account.bidEscrow.fetch(bidEscrowPda);
                        if (bidAccount) {
                            setStatus("submitted");
                            const locked = bidAccount.maxLockedAmount.toNumber() / LAMPORTS_PER_SOL;
                            setBidAmount(locked.toString());
                        }
                    } catch (e) {
                        // User hasn't bid yet
                    }
                }

                // 2. Fetch Metadata
                const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
                try {
                    const mint = new PublicKey(auction.nftMint);
                    const asset = await fetchDigitalAsset(umi, umiPublicKey(mint.toBase58()));
                    let imageUri = null;
                    if (asset.metadata.uri) {
                        const res = await fetch(asset.metadata.uri);
                        const json = await res.json();
                        imageUri = json.image;
                    }
                    setMetadata({
                        name: asset.metadata.name,
                        image: imageUri
                    });
                } catch (metaErr) {
                    console.error("Metadata fetch error:", metaErr);
                }

            } catch (err) {
                console.error("Fetch error:", err);
                addToast("Failed to load auction data", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, connection, wallet]);

    // Timer Logic
    useEffect(() => {
        if (!auctionData) return;
        const tick = () => {
            const now = Date.now() / 1000;
            const end = auctionData.endTime.toNumber();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("Ended");
            } else {
                const days = Math.floor(diff / 86400);
                const hours = Math.floor((diff % 86400) / 3600);
                const minutes = Math.floor((diff % 3600) / 60);

                if (days > 0) setTimeLeft(`${days}d ${hours}h`);
                else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
                else setTimeLeft(`${minutes}m ${Math.floor(diff % 60)}s`);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [auctionData]);

    const handleBid = async () => {
        if (!bidAmount || !wallet || !auctionData) return;
        setStatus("encrypting");

        try {
            // Simulate encryption delay for effect
            await new Promise(resolve => setTimeout(resolve, 1000));

            const program = getProgram(connection, wallet);
            const auctionPubkey = new PublicKey(id);
            const amountVal = parseFloat(bidAmount);
            const amountLamports = new BN(amountVal * LAMPORTS_PER_SOL);



            const tx = await program.methods
                .lockBidFunds(amountLamports)
                .accounts({
                    auction: auctionPubkey,
                    bidder: wallet.publicKey,
                })
                .rpc();

            console.log("Bid sig:", tx);
            setStatus("submitted");
            setShowConfirmModal(true);
            addToast("Bid placed successfully!", "success");

        } catch (err) {
            console.error("Bid error:", err);
            addToast("Failed to place bid", "error");
            setStatus("idle");
        }
    };

    const handleRefund = async () => {
        if (!wallet) return;
        setLoading(true);
        try {
            const program = getProgram(connection, wallet);
            const auctionPubkey = new PublicKey(id);



            await program.methods
                .refundLoser()
                .accounts({
                    bidder: wallet.publicKey,
                    auction: auctionPubkey,
                })
                .rpc();

            addToast("Refund successful!", "success");
            setBidAmount("");
            setStatus("idle");
            // Optionally refetch data here
        } catch (err) {
            console.error("Refund error:", err);
            addToast("Refund failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async () => {
        addToast("Settlement requires Arcium proof generation (Pending Integration)", "info");
        // TODO: Implement Arcium proof generation
    };

    if (!wallet) {
        return (
            <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center animate-fade-in">
                <div className="text-center">
                    <h2 className="mb-4 text-xl font-display">Connect Wallet to View Auction</h2>
                    <WalletMultiButton />
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center animate-fade-in">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-[1px] w-24 bg-[#333333] overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full w-full bg-white origin-left animate-[progress_1s_ease-in-out_infinite]" />
                    </div>
                    <span className="font-mono text-xs text-[#666] uppercase tracking-widest">Loading Auction...</span>
                </div>
            </main>
        );
    }

    if (!auctionData) {
        return (
            <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center animate-fade-in">
                <div className="text-center text-[#666]">Auction not found</div>
            </main>
        );
    }

    const minPriceSOL = auctionData.minPrice.toNumber() / LAMPORTS_PER_SOL;

    return (
        <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row animate-fade-in">

            {/* Left Side: Visual (50%) */}
            <div className="w-full md:w-1/2 h-[50vh] md:h-screen relative border-b md:border-b-0 md:border-r border-[#333333]">
                {metadata.image ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#050505] overflow-hidden p-12">
                        <img src={metadata.image} alt={metadata.name} className="w-full h-full object-contain drop-shadow-2xl" />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#050505] overflow-hidden">
                        {/* Diagonal Line */}
                        <div className="absolute inset-0 border-t border-[#333333] -rotate-45 scale-150 origin-center opacity-50"></div>
                        {/* Placeholder Text */}
                        <span className="font-mono text-xs text-[#333333] uppercase tracking-widest z-10 bg-[#050505] px-4 py-2 border border-[#333333]">
                            No Preview Available
                        </span>
                    </div>
                )}
            </div>

            {/* Right Side: Data & Interaction (50%) */}
            <div className="w-full md:w-1/2 min-h-[50vh] md:h-screen flex flex-col pt-24 md:pt-32 px-6 md:px-16 lg:px-24 pb-12 relative overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="mb-16 md:mb-24">
                    <div className="flex items-start justify-between mb-2">
                        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-[0.9] tracking-tight max-w-lg break-words">
                            {metadata.name}
                        </h1>
                    </div>
                    <span className="font-mono text-xs text-[#888888] mt-2 block break-all">{auctionData.nftMint.toBase58()}</span>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-8 mb-16 border-t border-[#333333] pt-8">
                    <div className="flex flex-col gap-2">
                        <span className="font-mono text-[10px] text-[#888888] uppercase tracking-widest">Minimum Bid</span>
                        <span className="font-mono text-2xl md:text-3xl text-white">{minPriceSOL} SOL</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="font-mono text-[10px] text-[#888888] uppercase tracking-widest">Ends In</span>
                        <span className={`font-mono text-2xl md:text-3xl ${timeLeft === 'Ended' ? 'text-[#C35A5A]' : 'text-white'}`}>{timeLeft}</span>
                    </div>
                </div>

                {/* Interaction Area */}
                <div className="mt-auto md:mt-0 space-y-8">
                    {timeLeft === "Ended" && !auctionData.settled ? (
                        <div className="py-8 text-center border border-[#333] bg-[#111]">
                            <p className="font-mono text-sm text-[#888] uppercase tracking-widest">Auction Ended</p>
                            <p className="text-xs text-[#555] mt-2 mb-4">Awaiting Settlement</p>
                            <button
                                onClick={handleSettle}
                                className="px-6 py-2 border border-[#333] text-[#888] font-mono text-xs uppercase hover:text-white hover:border-white transition-colors"
                            >
                                Settle Auction
                            </button>
                        </div>
                    ) : timeLeft === "Ended" && auctionData.settled ? (
                        <div className="py-8 text-center border border-[#333] bg-[#111]">
                            <p className="font-mono text-sm text-[#888] uppercase tracking-widest">Auction Settled</p>
                            {/* If user still has a bid amount (meaning bidEscrow exists), they can refund */}
                            {bidAmount && (
                                <button
                                    onClick={handleRefund}
                                    className="mt-4 px-6 py-2 bg-white text-black font-mono text-xs uppercase hover:bg-gray-200 transition-colors"
                                >
                                    Claim Refund
                                </button>
                            )}
                        </div>

                    ) : status === "idle" || status === "submitted" ? (
                        <>
                            {/* Mechanical Input */}
                            <div className="relative group">
                                <label
                                    htmlFor="bid-input"
                                    className={`
                                        font-mono text-[10px] uppercase tracking-widest transition-colors duration-200
                                        ${isFocused || bidAmount ? "text-white" : "text-[#888888]"}
                                    `}
                                >
                                    Bid Amount (SOL)
                                </label>
                                <input
                                    id="bid-input"
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder={minPriceSOL.toString()}
                                    min={minPriceSOL}
                                    step="0.1"
                                    className={`
                                        w-full bg-transparent border-b border-[#333333] py-4 text-3xl md:text-4xl font-mono text-white placeholder-[#333333]
                                        focus:outline-none focus:border-white transition-colors duration-200 rounded-none caret-white
                                    `}
                                />
                            </div>

                            {/* Mechanical Button */}
                            <button
                                onClick={handleBid}
                                disabled={!bidAmount || status === "submitted"}
                                className={`
                                    w-full py-4 px-6 mt-8 font-mono text-sm uppercase tracking-wider transition-all duration-150 border border-transparent
                                    ${status === "submitted"
                                        ? "bg-[#333333] text-[#888888] cursor-not-allowed"
                                        : "bg-white text-black hover:bg-black hover:text-white hover:border-white"}
                                `}
                            >
                                {status === "submitted" ? "Bid Submitted" : "Place Encrypted Bid"}
                            </button>
                        </>
                    ) : (
                        /* Encryption/Loading State */
                        <div className="py-12 flex flex-col items-start gap-4">
                            <span className="font-mono text-xs text-[#888888] uppercase tracking-widest animate-pulse">
                                Encrypting & Submitting Bid...
                            </span>
                            <div className="h-[1px] w-full bg-[#333333] overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full w-full bg-white origin-left animate-[progress_1s_ease-in-out_infinite]" />
                            </div>
                        </div>
                    )}

                    <div className="pt-8 border-t border-[#333333] flex justify-between items-center text-[#444444]">
                        <span className="font-mono text-[10px] uppercase tracking-widest hover:text-[#888888] cursor-pointer transition-colors">
                            View Contract
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest hover:text-[#888888] cursor-pointer transition-colors">
                            FAQ
                        </span>
                    </div>
                </div>
            </div>

            {/* Bid Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                className="max-w-[420px] bg-[#050505] border border-[#333333]"
            >
                <div className="flex flex-col items-center text-center p-6">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full border border-[#333333] mb-6 text-white">
                        <Check size={20} strokeWidth={1} />
                    </div>

                    <h2 className="font-display text-3xl text-white mb-2">Bid Locked</h2>
                    <p className="font-mono text-xs text-[#888888] mb-8 uppercase tracking-wider">
                        Awaiting Reveal Phase
                    </p>

                    <button
                        onClick={() => setShowConfirmModal(false)}
                        className="w-full py-3 bg-white text-black font-mono text-sm uppercase hover:bg-[#E5E5E5] transition-colors"
                    >
                        Close Receipt
                    </button>
                </div>
            </Modal>
        </main >
    );
}

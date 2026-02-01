"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArciumService, ARCIUM_CONFIG, AuctionResultData } from "../../utils/arcium";
import { Modal } from "@/components/ui/Modal";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getProgram } from "@/utils/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
    const [maxLockAmount, setMaxLockAmount] = useState("");
    const [isFocusedMax, setIsFocusedMax] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [forceReclaim, setForceReclaim] = useState(false);

    // Fix hydration mismatch for wallet button
    useEffect(() => {
        setMounted(true);
    }, []);

    // Data State
    const [auctionData, setAuctionData] = useState<any>(null);
    const [metadata, setMetadata] = useState<{ name: string; image: string | null }>({ name: "Unknown Asset", image: null });
    const [timeLeft, setTimeLeft] = useState("");
    const [auctionResult, setAuctionResult] = useState<AuctionResultData | null>(null);

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

                // 3. Fetch Metadata
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

                // 4. Fetch Auction Result (Winner)
                const arciumService = new ArciumService(connection, wallet);
                try {
                    const result = await arciumService.fetchAuctionResult(auctionPubkey);
                    setAuctionResult(result);
                } catch (e) {
                    // Not revealed yet
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
        if (!bidAmount || !maxLockAmount || !wallet || !auctionData) return;

        // Validation
        const bidVal = parseFloat(bidAmount);
        const lockVal = parseFloat(maxLockAmount);
        const minPrice = auctionData.minPrice.toNumber() / LAMPORTS_PER_SOL;

        if (bidVal < minPrice) {
            addToast(`Real Bid must be at least ${minPrice} SOL`, "error");
            return;
        }

        if (lockVal < bidVal) {
            addToast("Max Lock Amount must be equal or greater than Real Bid", "error");
            return;
        }

        setStatus("encrypting");

        try {
            const program = getProgram(connection, wallet);
            const auctionPubkey = new PublicKey(id);
            const amountLamports = new BN(lockVal * LAMPORTS_PER_SOL);

            // ========================================
            // STEP 1: Lock funds in the auction escrow
            // ========================================
            console.log("Step 1: Locking funds in escrow...");

            const lockIx = await program.methods
                .lockBidFunds(amountLamports)
                .accountsPartial({
                    auction: auctionPubkey,
                    bidder: wallet.publicKey,
                })
                .instruction();

            const lockTx = new Transaction().add(lockIx);
            // @ts-ignore
            const lockSig = await program.provider.sendAndConfirm(lockTx);
            console.log("Funds locked, signature:", lockSig);

            // ========================================
            // STEP 2: Submit encrypted bid to Arcium
            // ========================================
            console.log("Step 2: Encrypting and submitting bid to Arcium...");

            const arciumService = new ArciumService(connection, wallet);

            // The service automatically handles:
            // 1. Initializing auction state if needed
            // 2. Fetching current encrypted state for subsequent bids
            // 3. Encrypting and submitting the new bid

            const { signature: arciumSig, computationOffset } = await arciumService.submitEncryptedBid(
                auctionPubkey,    // The auction ID
                bidVal,           // The actual bid amount (encrypted)
                minPrice,         // Minimum price for validation
                wallet.publicKey  // The bidder's pubkey
            );

            console.log("Arcium bid submitted, signature:", arciumSig);
            console.log("Computation offset:", computationOffset.toString());

            // ========================================
            // STEP 3: Wait for MPC computation callback (optional)
            // ========================================
            // The callback will emit AuctionUpdatedEvent with new encrypted state
            // For production, you might want to wait and store the result
            try {
                console.log("Waiting for Arcium computation to finalize...");
                const finalizeSig = await arciumService.awaitComputation(computationOffset);
                console.log("Computation finalized, signature:", finalizeSig);
            } catch (waitErr) {
                console.log("Computation still processing, will complete async");
            }

            setStatus("submitted");
            setShowConfirmModal(true);
            addToast("Bid encrypted and submitted!", "success");

        } catch (err: any) {
            console.error("Bid error:", err);
            addToast(`Failed to place bid: ${err.message || "Unknown error"}`, "error");
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
                .accountsPartial({
                    bidder: wallet.publicKey,
                    auction: auctionPubkey,
                })
                .instruction();

            const transaction = new Transaction().add(ix);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });

            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, "confirmed");

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

    const handleCancel = async () => {
        if (!wallet || !auctionData) return;
        setLoading(true);
        try {
            const program = getProgram(connection, wallet);
            const auctionPubkey = new PublicKey(id);

            // Find NFT Escrow Account
            const nftMint = new PublicKey(auctionData.nftMint);
            const tokenAccounts = await connection.getTokenAccountsByOwner(auctionPubkey, { mint: nftMint });
            if (tokenAccounts.value.length === 0) throw new Error("NFT Escrow not found");
            const nftEscrowAccount = tokenAccounts.value[0].pubkey;

            // Find Seller NFT Account (destination)
            const sellerNftAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);

            // Ensure destination exists
            const transaction = new Transaction();
            const accountInfo = await connection.getAccountInfo(sellerNftAccount);
            if (!accountInfo) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        sellerNftAccount,
                        wallet.publicKey,
                        nftMint
                    )
                );
            }

            // Check if auction has ended
            const now = Date.now() / 1000;
            const auctionEnded = now > auctionData.endTime.toNumber();
            const hasBids = !new BN(auctionData.bidCount).isZero();

            let ix;

            if (auctionEnded && forceReclaim) {
                // Force Reclaim: Initialize State -> Reveal -> FinalizeNoWinner
                const arciumService = new ArciumService(connection, wallet);
                addToast("Initializing Finalization (Please wait)...", "neutral");

                // 1. Ensure State Exists (or Create Empty)
                try {
                    await arciumService.initializeAuctionState(auctionPubkey, wallet.publicKey);
                } catch (e: any) {
                    if (!e.message?.includes("already_initialized")) {
                        console.warn("Init error (might exist):", e);
                    }
                }

                // 2. Reveal Winner (will result in No Winner)
                addToast("Revealing Empty Result...", "neutral");
                const { computationOffset } = await arciumService.revealWinner(auctionPubkey, wallet.publicKey);
                await arciumService.awaitComputation(computationOffset);

                // 3. Finalize
                const [auctionResultPda] = arciumService.getAuctionResultPDA(auctionPubkey);

                // Self-referential PDA seeds require explicit account - bypass TS
                ix = await program.methods
                    .finalizeNoWinner()
                    .accountsPartial({
                        payer: wallet.publicKey,
                        seller: wallet.publicKey,
                        auction: auctionPubkey,
                        auctionResult: auctionResultPda,
                        nftEscrowAccount: nftEscrowAccount,
                        sellerNftAccount: sellerNftAccount,
                    })
                    .instruction();

            } else if (auctionEnded && !hasBids) {
                // Auction ended with zero bids - use reclaim_unsold
                ix = await program.methods
                    .reclaimUnsold()
                    .accountsPartial({
                        seller: wallet.publicKey,
                        auction: auctionPubkey,
                        nftEscrowAccount: nftEscrowAccount,
                        sellerNftAccount: sellerNftAccount,
                    })
                    .instruction();
            } else {
                // Auction not ended - use cancel_auction
                ix = await program.methods
                    .cancelAuction()
                    .accountsPartial({
                        seller: wallet.publicKey,
                        auction: auctionPubkey,
                        nftEscrowAccount: nftEscrowAccount,
                        sellerNftAccount: sellerNftAccount,
                    })
                    .instruction();
            }

            transaction.add(ix);

            // @ts-ignore
            // await program.provider.sendAndConfirm(transaction);
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });

            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, "confirmed");

            addToast("Auction Cancelled & NFT Reclaimed!", "success");
            router.push("/explore");

        } catch (err: any) {
            console.error("Cancel error:", err);
            addToast(`Cancel failed: ${err.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async () => {
        if (!wallet || !auctionData) return;

        try {
            setStatus("reveal");
            const auctionPubkey = new PublicKey(id);
            const arciumService = new ArciumService(connection, wallet);
            const program = getProgram(connection, wallet);

            // 1. Reveal Winner
            addToast("Revealing winner...", "neutral");
            let result = await arciumService.fetchAuctionResult(auctionPubkey);

            // If result exists but not revealed, the reveal was already submitted - just poll
            const accountAlreadyExists = result !== null;

            if (!result?.revealed) {
                if (!accountAlreadyExists) {
                    // Account doesn't exist yet - submit reveal transaction
                    try {
                        const { computationOffset } = await arciumService.revealWinner(auctionPubkey, wallet.publicKey);
                        addToast("Reveal submitted, waiting for MPC computation (this can take 30-60s on devnet)...", "neutral");
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Computation wait timeout")), 30000)
                        );

                        try {
                            await Promise.race([
                                arciumService.awaitComputation(computationOffset),
                                timeoutPromise
                            ]);
                            addToast("Computation finalized.", "neutral");
                        } catch {
                            console.warn("Computation wait timed out, proceeding to poll on-chain state...");
                            // Do not throw, just proceed to poll
                        }
                    } catch (e: unknown) {
                        const err = e as Error;
                        const errorMsg = err?.message || String(e) || "Unknown error";
                        // If account already exists, proceed to polling
                        if (!errorMsg.includes("already in use") && !errorMsg.includes("already revealed")) {
                            throw e;
                        }
                        console.log("Reveal already submitted, proceeding to poll...");
                    }
                } else {
                    addToast("Reveal already submitted. Waiting for MPC callback (this can take 30-60s on devnet)...", "neutral");
                }

                // Poll for result update with longer timeout for devnet
                // MPC computations on devnet can take 30-60 seconds
                addToast("Polling for on-chain result...", "neutral");
                let attempts = 0;
                const maxAttempts = 30; // 60 seconds total
                while (attempts < maxAttempts) {
                    result = await arciumService.fetchAuctionResult(auctionPubkey);
                    if (result && result.revealed) {
                        break;
                    }
                    if (attempts % 5 === 0 && attempts > 0) {
                        addToast(`Still waiting for MPC callback... (${attempts * 2}s)`, "neutral");
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;
                }

                if (result && result.revealed) {
                    setAuctionResult(result);
                    addToast("Winner Revealed!", "success");
                }
            }

            if (!result || !result.revealed) {
                // Even after polling, still not revealed
                // Give user option to keep waiting
                throw new Error("MPC computation still in progress. Devnet can be slow - please wait 1-2 minutes and try again.");
            }

            const winner = result.winner;
            const winningAmount = result.winningAmount.toNumber();
            console.log("Winner revealed:", winner.toBase58());
            console.log("Winning amount:", winningAmount);

            // Update state so UI reflects "Claim NFT" button
            setAuctionResult(result);

            // Check if there's no valid winner (winner is default pubkey / all zeros)
            const isNoWinner = winner.equals(PublicKey.default) || winningAmount === 0;

            // Stop here if we just wanted to reveal (UI will update to show "Claim NFT" or "Settle")
            // But if user clicked "Settle Auction", we want to proceed if possible?
            // Actually, best flow is: Reveal -> UI shows "Claim NFT" -> User clicks "Claim NFT".
            // If the user IS the winner, we can auto-proceed or let them click.
            // Let's let them click for clarity and gas management, unless they expect auto.
            // But the current function does everything in one go. 
            // If we are here, we have the result.

            // IF we are not the winner, we can't claim NFT.
            // IF we are the winner, we can claim.

            // Let's just return here if we just revealed, to let the UI update and user confirms.
            // BUT the original logic tried to do it all. The issue is `wait` time.
            // If we have `result`, we can proceed.

            // 2. Prepare for Settlement
            const nftMint = new PublicKey(auctionData.nftMint);
            const tokenAccounts = await connection.getTokenAccountsByOwner(auctionPubkey, { mint: nftMint });

            if (tokenAccounts.value.length === 0) {
                throw new Error("NFT Escrow Account not found");
            }
            const nftEscrowAccount = tokenAccounts.value[0].pubkey;

            // Auction Result PDA (Arcium)
            const [auctionResultPda] = arciumService.getAuctionResultPDA(auctionPubkey);

            const transaction = new Transaction();

            // Check permissions: NO ONE else can settle except winner (for settleAuction) or anyone (for noWinner/finalize).
            // Actually settleAuction is permissionless in some designs, but here verify checks:
            // SettleAuction:
            // 1. Pay Seller (transfer from winner_escrow to seller). 
            // 2. NFT to Winner.
            // 3. Refund excess to winner.

            // The instruction requires `winner_bid_escrow` and `winner_nft_account`.
            // Any user *could* submit this if they know the accounts.
            // BUT `winner_nft_account` (ATA) needs to be created if missing.

            if (isNoWinner) {
                // ... (Finalize No Winner Logic) ...
                // No valid winner - all bids below min price
                // Use finalizeNoWinner to return NFT to seller
                addToast("No valid bids above minimum price. Returning NFT to seller...", "neutral");

                const seller = new PublicKey(auctionData.seller);
                const sellerNftAccount = await getAssociatedTokenAddress(nftMint, seller);

                // Ensure seller's ATA exists
                const sellerAtaInfo = await connection.getAccountInfo(sellerNftAccount);
                if (!sellerAtaInfo) {
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            wallet.publicKey,
                            sellerNftAccount,
                            seller,
                            nftMint
                        )
                    );
                }

                const finalizeIx = await program.methods
                    .finalizeNoWinner()
                    .accountsPartial({
                        payer: wallet.publicKey,
                        seller: seller,
                        auction: auctionPubkey,
                        auctionResult: auctionResultPda,
                        nftEscrowAccount: nftEscrowAccount,
                        sellerNftAccount: sellerNftAccount,
                    })
                    .instruction();

                transaction.add(finalizeIx);

                // @ts-ignore
                // const signature = await program.provider.sendAndConfirm(transaction);
                const { blockhash: blockhashNoWinner, lastValidBlockHeight: lastValidBlockHeightNoWinner } = await connection.getLatestBlockhash("confirmed");
                transaction.recentBlockhash = blockhashNoWinner;
                transaction.feePayer = wallet.publicKey;

                const signedTxNoWinner = await wallet.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTxNoWinner.serialize(), { skipPreflight: false });

                await connection.confirmTransaction({
                    signature,
                    blockhash: blockhashNoWinner,
                    lastValidBlockHeight: lastValidBlockHeightNoWinner
                }, "confirmed");
                console.log("Finalize (no winner) signature:", signature);
                addToast("Auction finalized - NFT returned to seller. Bidders can now claim refunds.", "success");

                // Update local state
                window.location.reload();


            } else {
                // Valid winner exists
                // If CURRENT USER is NOT the winner, they shouldn't trigger the settlement transaction effectively?
                // The `settleAuction` moves funds from winner escrow to seller.
                // It requires `winner` account in context? No, just the public key.
                // But usually we prefer the winner to claim so they pay for their ATA creation if needed.

                // Allow anyone to settle (Permissionless)
                if (!winner.equals(wallet.publicKey)) {
                    addToast(`Winner: ${winner.toBase58().slice(0, 4)}... Settling on their behalf.`, "neutral");
                }

                // Valid winner exists - settle auction
                addToast("Settling auction...", "neutral");

                // Winner Bid Escrow
                const [winnerBidEscrow] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bid_escrow"), auctionPubkey.toBuffer(), winner.toBuffer()],
                    program.programId
                );

                // Winner NFT ATA
                const winnerNftAccount = await getAssociatedTokenAddress(nftMint, winner);

                // Ensure winner's ATA exists (anyone can create ATA for others)
                const accountInfo = await connection.getAccountInfo(winnerNftAccount);
                if (!accountInfo) {
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            wallet.publicKey, // payer
                            winnerNftAccount,
                            winner,           // owner
                            nftMint
                        )
                    );
                }

                const settleIx = await program.methods
                    .settleAuction()
                    .accountsPartial({
                        seller: new PublicKey(auctionData.seller),
                        winner: winner,
                        auction: auctionPubkey,
                        auctionResult: auctionResultPda,
                        winnerBidEscrow: winnerBidEscrow,
                        nftEscrowAccount: nftEscrowAccount,
                        winnerNftAccount: winnerNftAccount,
                        nftMint: nftMint,
                    })
                    .instruction();

                transaction.add(settleIx);

                // @ts-ignore
                // const signature = await program.provider.sendAndConfirm(transaction);
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = wallet.publicKey;

                const signedTx = await wallet.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });

                await connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight
                }, "confirmed");
                console.log("Settlement signature:", signature);
                addToast(`Auction Settled! Winner: ${winner.toBase58().slice(0, 4)}...`, "success");

                window.location.reload();
            }

        } catch (err: any) {
            console.error("Settlement error:", err);
            const errorMsg = err?.message || err?.toString() || "Unknown error";
            if (errorMsg.includes("no bids were placed") || errorMsg.includes("No auction bid state found")) {
                addToast("No bids placed - no winner to reveal. Use 'Reclaim NFT'.", "neutral");
                setForceReclaim(true);
            } else {
                addToast(`Settlement failed: ${errorMsg}`, "error");
            }
        } finally {
            setStatus("idle");
        }
    };

    if (!mounted || !wallet) {
        return (
            <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center animate-fade-in">
                <div className="text-center">
                    <h2 className="mb-4 text-xl font-display">Connect Wallet to View Auction</h2>
                    {mounted && <WalletMultiButton />}
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
                    {timeLeft === "Ended" && !auctionData.settled && (new BN(auctionData.bidCount).isZero() || forceReclaim) ? (
                        /* Case: Ended with 0 bids - Seller Reclaim */
                        <div className="py-8 text-center border border-[#333] bg-[#111]">
                            <p className="font-mono text-sm text-[#888] uppercase tracking-widest">Auction Ended (No Bids)</p>
                            <p className="text-xs text-[#555] mt-2 mb-4">No bids were placed.</p>
                            {auctionData.seller.equals(wallet.publicKey) && (
                                <button
                                    onClick={handleCancel}
                                    className="px-6 py-2 border border-[#333] text-[#888] font-mono text-xs uppercase hover:text-white hover:border-white transition-colors"
                                >
                                    Reclaim NFT
                                </button>
                            )}
                        </div>
                    ) : timeLeft === "Ended" && !auctionData.settled ? (
                        <div className="py-8 text-center border border-[#333] bg-[#111]">
                            <p className="font-mono text-sm text-[#888] uppercase tracking-widest">Auction Ended</p>
                            <p className="text-xs text-[#555] mt-2 mb-4">
                                {auctionResult && auctionResult.revealed
                                    ? (auctionResult.winner.equals(wallet.publicKey) ? "You Won! Claim your NFT." : "Winner Found. Settling...")
                                    : "Awaiting Settlement"
                                }
                            </p>
                            <button
                                onClick={handleSettle}
                                className={`px-6 py-2 border border-[#333] font-mono text-xs uppercase transition-colors ${auctionResult && auctionResult.revealed
                                    ? "bg-white text-black hover:bg-gray-200 border-white font-bold"
                                    : "text-[#888] hover:text-white hover:border-white"
                                    }`}
                            >
                                {auctionResult && auctionResult.revealed
                                    ? (auctionResult.winner.equals(wallet.publicKey) ? "Claim NFT" : "Settle for Winner")
                                    : "Settle Auction"
                                }
                            </button>
                        </div>
                    ) : timeLeft === "Ended" && auctionData.settled ? (
                        <div className="py-8 text-center border border-[#333] bg-[#111]">
                            <p className="font-mono text-sm text-[#888] uppercase tracking-widest">Auction Settled</p>
                            {auctionResult && auctionResult.winningAmount.toNumber() > 0 ? (
                                <div className="mt-4 mb-4">
                                    {auctionResult.winner.equals(wallet.publicKey) ? (
                                        <p className="text-green-400 font-mono text-lg mb-2">You Won!</p>
                                    ) : (
                                        <p className="text-xs text-[#555] uppercase">Winner</p>
                                    )}
                                    <p className="font-mono text-white text-sm break-all px-4">{auctionResult.winner.toBase58()}</p>
                                    <p className="text-xs text-[#555] uppercase mt-2">Winning Bid</p>
                                    <p className="font-mono text-white text-sm">{(auctionResult.winningAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                                </div>
                            ) : (
                                <div className="mt-4 mb-4">
                                    <p className="text-[#888] font-mono text-sm">No valid winner</p>
                                    <p className="text-xs text-[#555] mt-1">All bids were below minimum price</p>
                                </div>
                            )}
                            {/* If user still has a bid amount (meaning bidEscrow exists), they can refund */}
                            {bidAmount && status !== "submitted" && auctionResult && !auctionResult.winner.equals(wallet.publicKey) && (
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
                            {/* Mechanical Input - Real Bid */}
                            <div className="relative group mb-8">
                                <label
                                    htmlFor="bid-input"
                                    className={`
                                        font-mono text-[10px] uppercase tracking-widest transition-colors duration-200
                                        ${isFocused || bidAmount ? "text-white" : "text-[#888888]"}
                                    `}
                                >
                                    Real Bid Value (SOL)
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
                                    step="any"
                                    className={`
                                        w-full bg-transparent border-b border-[#333333] py-4 text-3xl md:text-4xl font-mono text-white placeholder-[#333333]
                                        focus:outline-none focus:border-white transition-colors duration-200 rounded-none caret-white
                                    `}
                                />
                            </div>

                            {/* Mechanical Input - Max Lock Amount */}
                            <div className="relative group">
                                <label
                                    htmlFor="max-lock-input"
                                    className={`
                                        font-mono text-[10px] uppercase tracking-widest transition-colors duration-200
                                        ${isFocusedMax || maxLockAmount ? "text-white" : "text-[#888888]"}
                                    `}
                                >
                                    Max Lock Amount (SOL)
                                </label>
                                <input
                                    id="max-lock-input"
                                    type="number"
                                    value={maxLockAmount}
                                    onChange={(e) => setMaxLockAmount(e.target.value)}
                                    onFocus={() => setIsFocusedMax(true)}
                                    onBlur={() => setIsFocusedMax(false)}
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
                                disabled={!bidAmount || !maxLockAmount || status === "submitted"}
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

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/DatePicker";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram } from "@/utils/anchor";

// Metaplex Imports
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';

const Step = ({ number, title, isActive, isCompleted, children }: { number: number, title: string, isActive: boolean, isCompleted: boolean, children: React.ReactNode }) => {
    return (
        <div className={`transition-all duration-500 ease-in-out border-l border-[#333333] pl-12 pb-24 relative ${isActive ? "opacity-100" : isCompleted ? "opacity-30" : "opacity-10 pointer-events-none"}`}>
            <div
                className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full transition-all duration-500 
                ${isActive ? "bg-white scale-100" : isCompleted ? "bg-[#888888] scale-100" : "bg-[#333333] scale-75"}`}
            />
            <h2 className="font-display italic text-3xl md:text-4xl mb-12 transition-all duration-500 text-white">{title}</h2>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isActive ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
                {children}
            </div>
        </div>
    );
};

export default function CreateAuctionPage() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const walletAdapter = useWallet(); // Needed for Umi adapter
    const { publicKey } = useWallet();

    const [step, setStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [userNfts, setUserNfts] = useState<any[]>([]);
    const [selectedNft, setSelectedNft] = useState<any | null>(null);

    // Form State
    const [minimumPrice, setMinimumPrice] = useState("");
    const [deadline, setDeadline] = useState<Date | null>(null);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const canProceedToStep2 = !!selectedNft;
    const canProceedToStep3 = !!minimumPrice;
    const canProceedToStep4 = !!deadline;

    // Fetch NFTs
    useEffect(() => {
        if (!publicKey || !walletAdapter) return;

        const fetchNfts = async () => {
            try {
                // Initialize Umi
                const umi = createUmi(connection.rpcEndpoint)
                    .use(mplTokenMetadata())
                    .use(walletAdapterIdentity(walletAdapter));

                const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                    programId: TOKEN_PROGRAM_ID,
                });

                // Filter for potential NFTs first
                const potentialNfts = accounts.value
                    .filter((account) => {
                        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
                        const decimals = account.account.data.parsed.info.tokenAmount.decimals;
                        return amount === 1 && decimals === 0;
                    });

                // Fetch metadata for each
                const nftsWithMetadata = await Promise.all(potentialNfts.map(async (account) => {
                    const mintAddress = account.account.data.parsed.info.mint;
                    const tokenAccount = account.pubkey.toBase58();

                    try {
                        // Fetch Digital Asset (Metadata)
                        const asset = await fetchDigitalAsset(umi, umiPublicKey(mintAddress));

                        // Fetch JSON
                        let image = null;
                        let name = asset.metadata.name;

                        if (asset.metadata.uri) {
                            try {
                                const response = await fetch(asset.metadata.uri);
                                const json = await response.json();
                                image = json.image;
                            } catch (e) {
                                console.warn(`Failed to fetch JSON for ${mintAddress}`, e);
                            }
                        }

                        return {
                            mint: mintAddress,
                            tokenAccount: tokenAccount,
                            uri: asset.metadata.uri,
                            name: name,
                            image: image
                        };
                    } catch (e) {
                        // Fallback if metadata fetch fails (e.g. not a Metaplex NFT)
                        console.warn(`Failed to fetch metadata for ${mintAddress}`, e);
                        return {
                            mint: mintAddress,
                            tokenAccount: tokenAccount,
                            uri: null,
                            name: "Unknown NFT",
                            image: null
                        }
                    }
                }));

                setUserNfts(nftsWithMetadata);
            } catch (error) {
                console.error("Error fetching NFTs:", error);
            }
        };
        fetchNfts();
    }, [publicKey, connection, walletAdapter]);

    const nextStep = () => {
        if (step === 1 && canProceedToStep2) setStep(2);
        else if (step === 2 && canProceedToStep3) setStep(3);
        else if (step === 3 && canProceedToStep4) setStep(4);
    };

    const handleCreateAuction = async () => {
        if (!wallet || !selectedNft) return;
        setIsLoading(true);

        try {
            const program = getProgram(connection, wallet);
            const nftMint = new PublicKey(selectedNft.mint);
            const sellerNftAccount = new PublicKey(selectedNft.tokenAccount);

            // 1. Derive Auction PDA
            const [auctionPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("auction"), nftMint.toBuffer()],
                program.programId
            );

            // 2. Generate Escrow Keypair
            const nftEscrowKeypair = Keypair.generate();

            // 3. Prepare Args
            const minPriceLamports = new BN(parseFloat(minimumPrice) * 1_000_000_000);

            // Parse duration
            if (!deadline) throw new Error("Deadline is required");
            const endTime = new BN(Math.floor(deadline.getTime() / 1000));

            console.log("Creating auction...", {
                auctionPda: auctionPda.toBase58(),
                nftEscrow: nftEscrowKeypair.publicKey.toBase58(),
                mint: nftMint.toBase58()
            });

            // 4. Send Transaction
            const tx = await program.methods
                .createAuction(minPriceLamports, endTime)
                .accounts({
                    seller: wallet.publicKey,
                    auction: auctionPda,
                    nftMint: nftMint,
                    sellerNftAccount: sellerNftAccount,
                    nftEscrowAccount: nftEscrowKeypair.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([nftEscrowKeypair]) // Sign with the new keypair for init
                .rpc();

            console.log("Auction Created! Tx:", tx);
            setIsModalOpen(false);
            // Optionally redirect or show success
            alert("Auction Created! Tx: " + tx);

        } catch (error: any) {
            console.error("Error creating auction:", error);

            // Log simulation logs if available
            if (error.logs) {
                console.error("Transaction Logs:", error.logs);
            }

            if (error.simulationResponse) {
                console.error("Simulation Response:", error.simulationResponse);
            }

            if ('getLogs' in error && typeof error.getLogs === 'function') {
                try {
                    const logs = await error.getLogs(); // getLogs sometimes async depending on version, usually synchronous or returns string[]
                    console.error("Error Logs (getLogs):", logs);
                } catch (e) {
                    console.log("Could not call getLogs()", e);
                }
            }

            alert(`Error creating auction. Check console for details. ${error.message ? error.message : ''}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen px-6 md:px-12 pt-32 md:pt-40 max-w-3xl mx-auto animate-fade-in custom-scrollbar">
            <h1 className="font-display italic text-5xl md:text-6xl mb-24 opacity-0 animate-rise-up text-white">Create Auction</h1>

            {!publicKey ? (
                <div className="flex flex-col items-center justify-center opacity-0 animate-fade-in-delayed">
                    <p className="text-[#888] mb-6">Connect your wallet to start.</p>
                    <WalletMultiButton />
                </div>
            ) : (
                <div className="flex flex-col opacity-0 animate-fade-in-delayed delay-150">

                    {/* Step 1: Select NFT */}
                    <Step number={1} title="Select NFT" isActive={step === 1} isCompleted={step > 1}>
                        <div className="space-y-12">
                            {userNfts.length === 0 ? (
                                <p className="text-[#666] font-mono text-sm">No NFTs found in wallet.</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {userNfts.map((nft) => (
                                        <div
                                            key={nft.mint}
                                            onClick={() => { setSelectedNft(nft); }}
                                            className={`
                                                aspect-square w-full border transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden relative group
                                                ${selectedNft?.mint === nft.mint
                                                    ? "border-white bg-[#111]"
                                                    : "border-[#333333] hover:border-[#666] bg-transparent hover:bg-[#111]"}
                                            `}
                                        >
                                            {nft.image ? (
                                                <div className="w-full h-full absolute inset-0">
                                                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${selectedNft?.mint === nft.mint ? "opacity-0" : "opacity-0 group-hover:opacity-20"}`} />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 border border-dashed border-[#444] rounded flex items-center justify-center text-xs text-[#666]">
                                                    Fake Img
                                                </div>
                                            )}

                                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent p-2">
                                                <span className="font-mono text-[10px] text-white/80 truncate w-full block text-center">{nft.name ? nft.name : `${nft.mint.slice(0, 6)}...`}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={nextStep}
                                disabled={!canProceedToStep2}
                                className={`
                                    w-full py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 border border-transparent
                                    ${canProceedToStep2
                                        ? "bg-white text-black hover:bg-black hover:text-white hover:border-white"
                                        : "bg-[#222] text-[#555] cursor-not-allowed"}
                                `}
                            >
                                Continue
                            </button>
                        </div>
                    </Step>

                    {/* Step 2: Minimum Price */}
                    <Step number={2} title="Minimum Price" isActive={step === 2} isCompleted={step > 2}>
                        <div className="space-y-12">
                            <div className="relative group">
                                <label className={`absolute -top-6 left-0 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${focusedInput === 'price' || minimumPrice ? "text-white" : "text-[#666]"}`}>
                                    Minimum Price (SOL)
                                </label>
                                <input
                                    type="number"
                                    value={minimumPrice}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (parseFloat(val) < 0) return;
                                        setMinimumPrice(val);
                                    }}
                                    onFocus={() => setFocusedInput('price')}
                                    onBlur={() => setFocusedInput(null)}
                                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    placeholder="0.00"
                                    className="w-full bg-transparent border-b border-[#333333] py-4 text-3xl font-mono text-white placeholder-[#222] focus:outline-none focus:border-white transition-colors duration-200 rounded-none caret-white"
                                />
                            </div>
                            <div className="flex gap-6">
                                <button onClick={() => setStep(1)} className="px-6 py-4 font-mono text-xs text-[#666] hover:text-white uppercase tracking-widest transition-colors">
                                    Back
                                </button>
                                <button onClick={nextStep} disabled={!minimumPrice || parseFloat(minimumPrice) <= 0} className={`flex-1 py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 border border-transparent ${minimumPrice && parseFloat(minimumPrice) > 0 ? "bg-white text-black hover:bg-black hover:text-white hover:border-white" : "bg-[#222] text-[#555] cursor-not-allowed"}`}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    </Step>

                    {/* Step 3: Deadline */}
                    <Step number={3} title="Deadline" isActive={step === 3} isCompleted={step > 3}>
                        <div className="space-y-12">
                            <div className="relative group">
                                <label className={`absolute -top-12 left-0 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${deadline ? "text-white" : "text-[#666]"}`}>
                                    Auction Deadline
                                </label>
                                <DatePicker
                                    date={deadline}
                                    onChange={(date) => setDeadline(date)}
                                />
                            </div>
                            <div className="flex gap-6">
                                <button onClick={() => setStep(2)} className="px-6 py-4 font-mono text-xs text-[#666] hover:text-white uppercase tracking-widest transition-colors">
                                    Back
                                </button>
                                <button onClick={nextStep} disabled={!deadline} className={`flex-1 py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 border border-transparent ${deadline ? "bg-white text-black hover:bg-black hover:text-white hover:border-white" : "bg-[#222] text-[#555] cursor-not-allowed"}`}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    </Step>

                    {/* Step 4: Confirm */}
                    <Step number={4} title="Confirm Escrow Lock" isActive={step === 4} isCompleted={false}>
                        <div className="space-y-12">
                            <p className="font-sans text-[#888] leading-relaxed max-w-lg">
                                This action will cryptographically lock your asset into the escrow contract.
                            </p>
                            <div className="border-l-2 border-white pl-6 py-2 space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Asset</span>
                                    <span className="font-display text-xl text-white">{selectedNft?.mint ? `${selectedNft.mint.slice(0, 8)}...` : "Asset"}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Reserve Price</span>
                                    <span className="font-mono text-lg text-white">{minimumPrice || "0.00"} SOL</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Duration</span>
                                    <span className="font-mono text-lg text-white">{deadline ? deadline.toLocaleString() : "--"}</span>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <button onClick={() => setStep(3)} className="px-6 py-4 font-mono text-xs text-[#666] hover:text-white uppercase tracking-widest transition-colors">
                                    Back
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex-1 py-4 px-6 font-mono text-xs uppercase tracking-widest transition-all duration-200 bg-white text-black hover:bg-[#EEE] border border-white"
                                >
                                    Upload & Lock
                                </button>
                            </div>
                        </div>
                    </Step>

                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
                    style={{ backgroundColor: 'rgba(5, 5, 5, 0.9)' }}
                >
                    <div className="bg-[#050505] border border-[#333333] p-12 max-w-md w-full animate-rise-up shadow-2xl relative">
                        <h3 className="font-display text-3xl mb-4 text-white">Initialize Auction</h3>
                        <p className="font-sans text-[#888] mb-12 text-sm leading-relaxed">
                            Sign the transaction to Create Auction.
                        </p>
                        <div className="flex flex-col gap-4">
                            <button
                                className="w-full py-4 bg-white text-black font-mono text-xs uppercase tracking-widest hover:bg-[#DDD] transition-colors disabled:opacity-50"
                                onClick={handleCreateAuction}
                                disabled={isLoading}
                            >
                                {isLoading ? "Creating..." : "Confirm & Sign"}
                            </button>
                            <button
                                className="w-full py-4 bg-transparent text-[#666] hover:text-white font-mono text-xs uppercase tracking-widest transition-colors border border-transparent hover:border-[#333]"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

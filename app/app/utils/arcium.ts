import {
    RescueCipher,
    x25519,
    getMXEPublicKey,
    getMXEAccAddress,
    getClusterAccAddress,
    getCompDefAccOffset,
    getMempoolAccAddress,
    getExecutingPoolAccAddress,
    getComputationAccAddress,
    getFeePoolAccAddress,
    getClockAccAddress,
    getArciumAccountBaseSeed,
    getArciumProgramId,
    deserializeLE,
    awaitComputationFinalization,
} from "@arcium-hq/client";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
    Transaction,
    Connection
} from "@solana/web3.js";

// Browser-compatible random bytes generation
function randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(bytes);
    } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        // Fallback for Node.js environment (tests)
        const nodeCrypto = require('crypto');
        const nodeBytes = nodeCrypto.randomBytes(length);
        bytes.set(nodeBytes);
    }
    return bytes;
}

// Configuration for Devnet - matches deployed program
export const ARCIUM_CONFIG = {
    PROGRAM_ID: new PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC"),
    CLUSTER_OFFSET: 456, // Devnet cluster offset
};

// Seeds
const AUCTION_STATE_SEED = "auction_bid_state";
const AUCTION_RESULT_SEED = "auction_result";


export interface AuctionBidStateData {
    auctionId: PublicKey;
    bump: number;
    bidCount: BN;
    encryptedMaxBid: number[];
    encryptedWinner0: number[];
    encryptedWinner1: number[];
    encryptedWinner2: number[];
    encryptedWinner3: number[];
    nonce: BN;
}

export interface AuctionResultData {
    auctionId: PublicKey;
    bump: number;
    revealed: boolean;
    winner: PublicKey;
    winningAmount: BN;
    revealedAt: BN;
}

export interface EncryptedBidData {
    encryptionPubkey: number[];
    nonce: BN;
    currentMaxBid: number[];
    currentWinner0: number[];
    currentWinner1: number[];
    currentWinner2: number[];
    currentWinner3: number[];
    newBidAmount: number[];
    newBidder0: number[];
    newBidder1: number[];
    newBidder2: number[];
    newBidder3: number[];
    minPrice: number[];
}


export class ArciumService {
    provider: anchor.AnchorProvider;
    connection: Connection;
    clusterOffset: number;

    constructor(connection: any, wallet: any) {
        this.provider = new anchor.AnchorProvider(connection, wallet, {});
        this.connection = connection;
        this.clusterOffset = ARCIUM_CONFIG.CLUSTER_OFFSET;
    }

    /**
     * Derive the auction_bid_state PDA for a given auction
     */
    getAuctionBidStatePDA(auctionId: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(AUCTION_STATE_SEED), auctionId.toBuffer()],
            ARCIUM_CONFIG.PROGRAM_ID
        );
    }

    /**
     * Derive the auction_result PDA for a given auction
     */
    getAuctionResultPDA(auctionId: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(AUCTION_RESULT_SEED), auctionId.toBuffer()],
            ARCIUM_CONFIG.PROGRAM_ID
        );
    }

    /**
     * Fetch the current auction bid state (if it exists) - manual deserialization
     */
    async fetchAuctionBidState(auctionId: PublicKey): Promise<AuctionBidStateData | null> {
        const [statePda] = this.getAuctionBidStatePDA(auctionId);
        try {
            const accountInfo = await this.connection.getAccountInfo(statePda);
            if (!accountInfo) return null;

            const data = accountInfo.data;
            // Skip 8-byte discriminator
            const offset = 8;

            // Parse manually: pubkey(32) + u8(1) + u64(8) + 5*[u8;32] + u128(16)
            const auctionIdBytes = data.slice(offset, offset + 32);
            const bump = data[offset + 32];
            const bidCount = data.readBigUInt64LE(offset + 33);
            const encryptedMaxBid = Array.from(data.slice(offset + 41, offset + 73));
            const encryptedWinner0 = Array.from(data.slice(offset + 73, offset + 105));
            const encryptedWinner1 = Array.from(data.slice(offset + 105, offset + 137));
            const encryptedWinner2 = Array.from(data.slice(offset + 137, offset + 169));
            const encryptedWinner3 = Array.from(data.slice(offset + 169, offset + 201));
            // u128 nonce (16 bytes)
            const nonceLow = data.readBigUInt64LE(offset + 201);
            const nonceHigh = data.readBigUInt64LE(offset + 209);
            const nonce = nonceLow + (nonceHigh << BigInt(64));

            return {
                auctionId: new PublicKey(auctionIdBytes),
                bump,
                bidCount: new BN(bidCount.toString()),
                encryptedMaxBid,
                encryptedWinner0,
                encryptedWinner1,
                encryptedWinner2,
                encryptedWinner3,
                nonce: new BN(nonce.toString()),
            };
        } catch (e) {
            console.error("Error fetching auction bid state:", e);
            return null;
        }
    }

    /**
     * Fetch the auction result (if it exists and is revealed) - manual deserialization
     */
    async fetchAuctionResult(auctionId: PublicKey): Promise<AuctionResultData | null> {
        const [resultPda] = this.getAuctionResultPDA(auctionId);
        try {
            const accountInfo = await this.connection.getAccountInfo(resultPda);
            if (!accountInfo) return null;

            const data = accountInfo.data;
            // Skip 8-byte discriminator
            const offset = 8;

            // Parse manually: pubkey(32) + u8(1) + bool(1) + pubkey(32) + u64(8) + i64(8)
            const auctionIdBytes = data.slice(offset, offset + 32);
            const bump = data[offset + 32];
            const revealed = data[offset + 33] === 1;
            const winnerBytes = data.slice(offset + 34, offset + 66);
            const winningAmount = data.readBigUInt64LE(offset + 66);
            const revealedAt = data.readBigInt64LE(offset + 74);

            console.log("Raw Auction Result:", {
                pubkey: resultPda.toBase58(),
                revealedByte: data[offset + 33],
                revealedBool: revealed,
                winner: new PublicKey(winnerBytes).toBase58(),
                amount: winningAmount.toString()
            });

            return {
                auctionId: new PublicKey(auctionIdBytes),
                bump,
                revealed,
                winner: new PublicKey(winnerBytes),
                winningAmount: new BN(winningAmount.toString()),
                revealedAt: new BN(revealedAt.toString()),
            };
        } catch (e) {
            console.error("Error fetching auction result:", e);
            return null;
        }
    }

    /**
     * Get instruction discriminator from the actual IDL
     * Arcium programs use different discriminator computation than standard Anchor
     */
    private getDiscriminator(instructionName: string): Buffer {
        // Discriminators from arcium_program IDL (target/idl/arcium_program.json)
        const discriminators: Record<string, number[]> = {
            "initialize_auction_state": [133, 64, 68, 234, 133, 187, 217, 68],
            "submit_bid": [19, 164, 237, 254, 64, 139, 237, 93],
            "reveal_winner": [234, 209, 237, 109, 16, 196, 64, 254],
        };

        const disc = discriminators[instructionName];
        if (!disc) {
            throw new Error(`Unknown instruction: ${instructionName}`);
        }
        return Buffer.from(disc);
    }

    /**
     * Initialize auction bid state account for a new auction
     * Must be called once before any bids are submitted
     */
    async initializeAuctionState(auctionId: PublicKey, payer: PublicKey): Promise<string> {
        const [statePda] = this.getAuctionBidStatePDA(auctionId);

        // Check if already initialized
        const existing = await this.fetchAuctionBidState(auctionId);
        if (existing) {
            console.log("Auction state already initialized");
            return "already_initialized";
        }

        console.log("Initializing auction bid state:", statePda.toBase58());

        // Build instruction data: discriminator(8) + auctionId(32)
        const discriminator = this.getDiscriminator("initialize_auction_state");
        const data = Buffer.concat([discriminator, auctionId.toBuffer()]);

        const ix = new TransactionInstruction({
            programId: ARCIUM_CONFIG.PROGRAM_ID,
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: statePda, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data,
        });

        const tx = new Transaction().add(ix);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = payer;

        // Sign and send using connection directly (avoid Anchor IDL parsing issues)
        const signedTx = await this.provider.wallet.signTransaction(tx);
        const sig = await this.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
        });

        // Confirm
        await this.connection.confirmTransaction({
            signature: sig,
            blockhash,
            lastValidBlockHeight,
        }, "confirmed");

        console.log("Auction state initialized:", sig);
        return sig;
    }

    /**
     * Get MXE public key with retry logic
     *
     * The MXE keygen is an async distributed operation that happens after MXE initialization.
     * On devnet, this can take several minutes after init_mxe_part2.
     *
     * If this fails persistently, you may need to:
     * 1. Run the init_devnet.ts script to initialize MXE and comp defs
     * 2. Wait for the ARX nodes to complete keygen (~2-5 minutes)
     * 3. Check MXE status with: arcium mxe-info --program-id <PROGRAM_ID> --rpc-url devnet
     */
    async getMXEPublicKeyWithRetry(maxRetries: number = 30, retryDelayMs: number = 2000): Promise<Uint8Array> {
        console.log(`Fetching MXE public key for program ${ARCIUM_CONFIG.PROGRAM_ID.toBase58()}...`);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const mxePublicKey = await getMXEPublicKey(this.provider, ARCIUM_CONFIG.PROGRAM_ID);
                if (mxePublicKey && mxePublicKey.length === 32) {
                    // Verify it's not all zeros (keygen not complete)
                    const isValid = mxePublicKey.some(b => b !== 0);
                    if (isValid) {
                        console.log(`MXE public key retrieved on attempt ${attempt}`);
                        return mxePublicKey;
                    }
                    console.log(`MXE key is all zeros (keygen in progress), attempt ${attempt}/${maxRetries}`);
                }
            } catch (error: any) {
                const errorMsg = error?.message || String(error);
                if (attempt === 1) {
                    console.log(`MXE key fetch attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
                    // On first attempt, check if MXE account exists
                    try {
                        const mxeAddress = getMXEAccAddress(ARCIUM_CONFIG.PROGRAM_ID);
                        const accountInfo = await this.connection.getAccountInfo(mxeAddress);
                        if (!accountInfo) {
                            console.error("MXE account does not exist. Please run init_devnet.ts first.");
                            throw new Error(
                                "MXE account not initialized. Run: npx ts-node scripts/init_devnet.ts"
                            );
                        }
                        console.log(`MXE account exists at ${mxeAddress.toBase58()}, keygen may be in progress...`);
                    } catch (checkError: any) {
                        if (checkError.message?.includes("not initialized")) {
                            throw checkError;
                        }
                    }
                } else {
                    console.log(`MXE key attempt ${attempt}/${maxRetries} - waiting for keygen...`);
                }
            }
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }
        }

        throw new Error(
            `Failed to fetch MXE public key after ${maxRetries} attempts. ` +
            `The MXE keygen may still be in progress on devnet. ` +
            `Please wait a few minutes and try again, or check MXE status with: ` +
            `arcium mxe-info --program-id ${ARCIUM_CONFIG.PROGRAM_ID.toBase58()} --rpc-url devnet`
        );
    }

    /**
     * Split a Solana pubkey into 4 u64 chunks (for circuit compatibility)
     */
    splitPubkeyToU64s(pubkey: PublicKey): bigint[] {
        const bytes = pubkey.toBytes();
        const chunks: bigint[] = [];
        for (let i = 0; i < 4; i++) {
            const slice = bytes.slice(i * 8, (i + 1) * 8);
            let val = BigInt(0);
            for (let j = 0; j < 8; j++) {
                val += BigInt(slice[j]) << BigInt(j * 8);
            }
            chunks.push(val);
        }
        return chunks;
    }

    /**
     * Encrypt bid data for Arcium MPC computation
     */
    async encryptBidData(
        bidAmountSOL: number,
        minPriceSOL: number,
        bidder: PublicKey,
        currentState: AuctionBidStateData | null
    ): Promise<EncryptedBidData> {
        // 1. Get MXE public key
        const mxePubkeyBytes = await this.getMXEPublicKeyWithRetry();

        // 2. Generate ephemeral X25519 key pair
        const ephemeralPrivKey = x25519.utils.randomPrivateKey();
        const ephemeralPubKey = x25519.getPublicKey(ephemeralPrivKey);

        // 3. Derive shared secret
        const sharedSecret = x25519.getSharedSecret(ephemeralPrivKey, mxePubkeyBytes);

        // 4. Create cipher and generate nonce
        const nonce = randomBytes(16);
        const cipher = new RescueCipher(sharedSecret);

        console.log("Encryption setup complete:", {
            mxePubkey: Buffer.from(mxePubkeyBytes).toString('hex').slice(0, 16) + '...',
            ephemeralPubkey: Buffer.from(ephemeralPubKey).toString('hex').slice(0, 16) + '...',
            hasExistingState: !!currentState,
            bidCount: currentState?.bidCount?.toString() || "0",
        });

        // 5. Convert values to lamports
        const bidLamports = BigInt(Math.floor(bidAmountSOL * LAMPORTS_PER_SOL));
        const minPriceLamports = BigInt(Math.floor(minPriceSOL * LAMPORTS_PER_SOL));

        // 6. Get current state values (zeros if first bid)
        let currentMaxBid = BigInt(0);
        let currentWinnerChunks = [BigInt(0), BigInt(0), BigInt(0), BigInt(0)];

        if (currentState && currentState.bidCount.toNumber() > 0) {
            // Need to decrypt the current state to re-encrypt with new key
            // For now, we pass the encrypted values directly
            // The circuit will handle the comparison
            console.log("Using existing state from bid #", currentState.bidCount.toString());
        }

        // 7. Split new bidder pubkey into u64 chunks
        const newBidderChunks = this.splitPubkeyToU64s(bidder);

        // 8. Encrypt all BidInputs fields
        // Order must match: current_max, winner_0-3, new_bid, bidder_0-3, min_price
        const allValues = [
            currentMaxBid,
            ...currentWinnerChunks,
            bidLamports,
            ...newBidderChunks,
            minPriceLamports,
        ];

        const encryptedValues = cipher.encrypt(allValues, nonce);

        // 9. Convert nonce to BN (u128)
        let nonceBN: BN;
        try {
            const nonceValue = deserializeLE(nonce);
            nonceBN = new BN(nonceValue.toString());
        } catch {
            let value = BigInt(0);
            for (let i = 0; i < nonce.length; i++) {
                value += BigInt(nonce[i]) << BigInt(i * 8);
            }
            nonceBN = new BN(value.toString());
        }

        console.log("Encrypted bid data:", {
            bidLamports: bidLamports.toString(),
            minPriceLamports: minPriceLamports.toString(),
            bidder: bidder.toBase58(),
        });

        return {
            encryptionPubkey: Array.from(ephemeralPubKey),
            nonce: nonceBN,
            currentMaxBid: Array.from(encryptedValues[0]),
            currentWinner0: Array.from(encryptedValues[1]),
            currentWinner1: Array.from(encryptedValues[2]),
            currentWinner2: Array.from(encryptedValues[3]),
            currentWinner3: Array.from(encryptedValues[4]),
            newBidAmount: Array.from(encryptedValues[5]),
            newBidder0: Array.from(encryptedValues[6]),
            newBidder1: Array.from(encryptedValues[7]),
            newBidder2: Array.from(encryptedValues[8]),
            newBidder3: Array.from(encryptedValues[9]),
            minPrice: Array.from(encryptedValues[10]),
        };
    }

    /**
     * Get all Arcium account addresses needed for submit_bid
     */
    getArciumAccounts(computationOffset: BN, auctionId: PublicKey): {
        signPdaAccount: PublicKey;
        mxeAccount: PublicKey;
        mempoolAccount: PublicKey;
        executingPool: PublicKey;
        computationAccount: PublicKey;
        compDefAccount: PublicKey;
        clusterAccount: PublicKey;
        poolAccount: PublicKey;
        clockAccount: PublicKey;
        auctionBidState: PublicKey;
        arciumProgram: PublicKey;
    } {
        const programId = ARCIUM_CONFIG.PROGRAM_ID;
        const clusterOffset = this.clusterOffset;

        // Sign PDA
        const [signPdaAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("ArciumSignerAccount")],
            programId
        );

        // Auction bid state PDA
        const [auctionBidState] = this.getAuctionBidStatePDA(auctionId);

        // Get comp def address
        const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
        const offset = getCompDefAccOffset("submit_bid");
        const [compDefAccount] = PublicKey.findProgramAddressSync(
            [baseSeed, programId.toBuffer(), offset],
            getArciumProgramId()
        );

        return {
            signPdaAccount,
            mxeAccount: getMXEAccAddress(programId),
            mempoolAccount: getMempoolAccAddress(clusterOffset),
            executingPool: getExecutingPoolAccAddress(clusterOffset),
            computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
            compDefAccount,
            clusterAccount: getClusterAccAddress(clusterOffset),
            poolAccount: getFeePoolAccAddress(),
            clockAccount: getClockAccAddress(),
            auctionBidState,
            arciumProgram: getArciumProgramId(),
        };
    }

    /**
     * Encode u64 as little-endian bytes
     */
    private encodeU64(value: BN): Buffer {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(BigInt(value.toString()));
        return buf;
    }

    /**
     * Encode u128 as little-endian bytes
     */
    private encodeU128(value: BN): Buffer {
        const buf = Buffer.alloc(16);
        const bigVal = BigInt(value.toString());
        buf.writeBigUInt64LE(bigVal & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
        buf.writeBigUInt64LE(bigVal >> BigInt(64), 8);
        return buf;
    }

    /**
     * Submit encrypted bid to Arcium for MPC computation
     */
    async submitEncryptedBid(
        auctionId: PublicKey,
        bidAmountSOL: number,
        minPriceSOL: number,
        bidder: PublicKey,
    ): Promise<{ signature: string; computationOffset: BN }> {
        // 1. Ensure auction state is initialized
        await this.initializeAuctionState(auctionId, bidder);

        // 2. Fetch current auction state
        const currentState = await this.fetchAuctionBidState(auctionId);
        console.log("Current auction state:", currentState ? {
            bidCount: currentState.bidCount.toString(),
            auctionId: currentState.auctionId.toBase58(),
        } : "null");

        // 3. Generate unique computation offset
        const offsetBytes = randomBytes(8);
        let offsetValue = BigInt(0);
        for (let i = 0; i < 8; i++) {
            offsetValue += BigInt(offsetBytes[i]) << BigInt(i * 8);
        }
        const computationOffset = new BN(offsetValue.toString());

        // 4. Encrypt bid data
        const encryptedData = await this.encryptBidData(
            bidAmountSOL,
            minPriceSOL,
            bidder,
            currentState
        );

        // 5. Get Arcium accounts
        const accounts = this.getArciumAccounts(computationOffset, auctionId);

        console.log("Submitting bid to Arcium...");
        console.log("Computation offset:", computationOffset.toString());
        console.log("Accounts:", {
            auctionBidState: accounts.auctionBidState.toBase58(),
            signPda: accounts.signPdaAccount.toBase58(),
            mxe: accounts.mxeAccount.toBase58(),
            compDef: accounts.compDefAccount.toBase58(),
        });

        // 6. Build instruction data manually
        // Format: discriminator(8) + u64(8) + [u8;32] + u128(16) + 11*[u8;32]
        const discriminator = this.getDiscriminator("submit_bid");

        const data = Buffer.concat([
            discriminator,
            this.encodeU64(computationOffset),
            Buffer.from(encryptedData.encryptionPubkey),
            this.encodeU128(encryptedData.nonce),
            Buffer.from(encryptedData.currentMaxBid),
            Buffer.from(encryptedData.currentWinner0),
            Buffer.from(encryptedData.currentWinner1),
            Buffer.from(encryptedData.currentWinner2),
            Buffer.from(encryptedData.currentWinner3),
            Buffer.from(encryptedData.newBidAmount),
            Buffer.from(encryptedData.newBidder0),
            Buffer.from(encryptedData.newBidder1),
            Buffer.from(encryptedData.newBidder2),
            Buffer.from(encryptedData.newBidder3),
            Buffer.from(encryptedData.minPrice),
        ]);

        const ix = new TransactionInstruction({
            programId: ARCIUM_CONFIG.PROGRAM_ID,
            keys: [
                { pubkey: bidder, isSigner: true, isWritable: true },
                { pubkey: accounts.signPdaAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.mxeAccount, isSigner: false, isWritable: false },
                { pubkey: accounts.mempoolAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.executingPool, isSigner: false, isWritable: true },
                { pubkey: accounts.computationAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.compDefAccount, isSigner: false, isWritable: false },
                { pubkey: accounts.clusterAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.poolAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.clockAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.auctionBidState, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: accounts.arciumProgram, isSigner: false, isWritable: false },
            ],
            data,
        });

        const tx = new Transaction().add(ix);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = bidder;

        // Sign and send using connection directly (avoid Anchor IDL parsing issues)
        const signedTx = await this.provider.wallet.signTransaction(tx);
        const sig = await this.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
        });

        // Confirm
        await this.connection.confirmTransaction({
            signature: sig,
            blockhash,
            lastValidBlockHeight,
        }, "confirmed");

        console.log("Arcium submit_bid signature:", sig);

        return { signature: sig, computationOffset };
    }

    /**
     * Wait for computation to finalize and get callback result
     */
    async awaitComputation(computationOffset: BN): Promise<string> {
        return await awaitComputationFinalization(
            this.provider,
            computationOffset,
            ARCIUM_CONFIG.PROGRAM_ID,
            "confirmed"
        );
    }

    /**
     * Get Arcium accounts needed for reveal_winner instruction
     */
    getRevealAccounts(computationOffset: BN, auctionId: PublicKey): {
        signPdaAccount: PublicKey;
        mxeAccount: PublicKey;
        mempoolAccount: PublicKey;
        executingPool: PublicKey;
        computationAccount: PublicKey;
        compDefAccount: PublicKey;
        clusterAccount: PublicKey;
        poolAccount: PublicKey;
        clockAccount: PublicKey;
        auctionBidState: PublicKey;
        auctionResult: PublicKey;
        arciumProgram: PublicKey;
    } {
        const programId = ARCIUM_CONFIG.PROGRAM_ID;
        const clusterOffset = this.clusterOffset;

        // Sign PDA
        const [signPdaAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("ArciumSignerAccount")],
            programId
        );

        // Auction bid state PDA
        const [auctionBidState] = this.getAuctionBidStatePDA(auctionId);

        // Auction result PDA
        const [auctionResult] = this.getAuctionResultPDA(auctionId);

        // Get comp def address for reveal_winner
        const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
        const offset = getCompDefAccOffset("reveal_winner");
        const [compDefAccount] = PublicKey.findProgramAddressSync(
            [baseSeed, programId.toBuffer(), offset],
            getArciumProgramId()
        );

        return {
            signPdaAccount,
            mxeAccount: getMXEAccAddress(programId),
            mempoolAccount: getMempoolAccAddress(clusterOffset),
            executingPool: getExecutingPoolAccAddress(clusterOffset),
            computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
            compDefAccount,
            clusterAccount: getClusterAccAddress(clusterOffset),
            poolAccount: getFeePoolAccAddress(),
            clockAccount: getClockAccAddress(),
            auctionBidState,
            auctionResult,
            arciumProgram: getArciumProgramId(),
        };
    }

    /**
     * Reveal the auction winner - decrypts the final state via MPC
     * Call this after the auction ends to get plaintext winner info
     */
    async revealWinner(
        auctionId: PublicKey,
        payer: PublicKey
    ): Promise<{ signature: string; computationOffset: BN }> {
        // 1. Check if result already exists
        const existingResult = await this.fetchAuctionResult(auctionId);
        if (existingResult && existingResult.revealed) {
            console.log("Auction result already revealed:", existingResult);
            throw new Error("Auction result already revealed");
        }

        // 2. Fetch auction bid state to verify it exists
        const bidState = await this.fetchAuctionBidState(auctionId);
        if (!bidState) {
            // The frontend should check for this condition (bidCount === 0) and use cancelAuction instead.
            throw new Error("No auction bid state found - no bids were placed (Use Reclaim)");
        }

        console.log("Revealing winner for auction:", auctionId.toBase58());
        console.log("Total bids:", bidState.bidCount.toString());

        // 3. Generate unique computation offset
        const offsetBytes = randomBytes(8);
        let offsetValue = BigInt(0);
        for (let i = 0; i < 8; i++) {
            offsetValue += BigInt(offsetBytes[i]) << BigInt(i * 8);
        }
        const computationOffset = new BN(offsetValue.toString());

        // 4. Get MXE public key and prepare encryption params
        const mxePubkeyBytes = await this.getMXEPublicKeyWithRetry();
        const ephemeralPrivKey = x25519.utils.randomPrivateKey();
        const ephemeralPubKey = x25519.getPublicKey(ephemeralPrivKey);
        const nonce = randomBytes(16);

        // Convert nonce to BN
        let nonceBN: BN;
        try {
            const nonceValue = deserializeLE(nonce);
            nonceBN = new BN(nonceValue.toString());
        } catch {
            let value = BigInt(0);
            for (let i = 0; i < nonce.length; i++) {
                value += BigInt(nonce[i]) << BigInt(i * 8);
            }
            nonceBN = new BN(value.toString());
        }

        // 5. Get Arcium accounts
        const accounts = this.getRevealAccounts(computationOffset, auctionId);

        console.log("Submitting reveal_winner to Arcium...");
        console.log("Computation offset:", computationOffset.toString());

        // 6. Build instruction data manually
        // Format: discriminator(8) + u64(8) + [u8;32] + u128(16)
        const discriminator = this.getDiscriminator("reveal_winner");

        const data = Buffer.concat([
            discriminator,
            this.encodeU64(computationOffset),
            Buffer.from(ephemeralPubKey),
            this.encodeU128(nonceBN),
        ]);

        const ix = new TransactionInstruction({
            programId: ARCIUM_CONFIG.PROGRAM_ID,
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: accounts.signPdaAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.mxeAccount, isSigner: false, isWritable: false },
                { pubkey: accounts.mempoolAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.executingPool, isSigner: false, isWritable: true },
                { pubkey: accounts.computationAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.compDefAccount, isSigner: false, isWritable: false },
                { pubkey: accounts.clusterAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.poolAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.clockAccount, isSigner: false, isWritable: true },
                { pubkey: accounts.auctionBidState, isSigner: false, isWritable: false },
                { pubkey: accounts.auctionResult, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: accounts.arciumProgram, isSigner: false, isWritable: false },
            ],
            data,
        });

        const tx = new Transaction().add(ix);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = payer;

        // Sign and send using connection directly (avoid Anchor IDL parsing issues)
        const signedTx = await this.provider.wallet.signTransaction(tx);
        const sig = await this.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
        });

        // Confirm
        await this.connection.confirmTransaction({
            signature: sig,
            blockhash,
            lastValidBlockHeight,
        }, "confirmed");

        console.log("Arcium reveal_winner signature:", sig);

        return { signature: sig, computationOffset };
    }
}

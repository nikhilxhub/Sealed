
import {
    RescueCipher,
    x25519,
    getMXEPublicKey,
    getMXEAccAddress,
    getClusterAccAddress,
    getCompDefAccAddress,
    getCompDefAccOffset
} from "@arcium-hq/client";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Configuration for Devnet
export const ARCIUM_CONFIG = {
    // These values come from npx tsx scripts/init_devnet.ts
    PROGRAM_ID: new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC"),
    CLUSTER_OFFSET: 456, // Active Cluster
    // Derived PDAs for convenience (logic repeated in class for safety)
    MXE_ACCOUNT: "8LU2pMTvpFWLUL4XqdW2cCv4RsKzLSHpKt3rvzfjJ5hu",
    CLUSTER_ACCOUNT: "DzaQCyfybroycrNqE5Gk7LhSbWD2qfCics6qptBFbr95"
};

export class ArciumService {
    provider: anchor.AnchorProvider;

    constructor(connection: any, wallet: any) {
        this.provider = new anchor.AnchorProvider(connection, wallet, {});
    }

    async submitBid(
        wrapperProgram: anchor.Program<any>,
        auctionId: PublicKey,
        bidAmount: number,
        minPrice: number,
        bidder: PublicKey
    ) {
        // 1. Get MXE Public Key (X25519)
        // Note: For Devnet, we might need a fallback if on-chain fetch fails due to instability
        let mxePubkeyBytes;
        try {
            mxePubkeyBytes = await getMXEPublicKey(this.provider, ARCIUM_CONFIG.PROGRAM_ID);
        } catch (e) {
            console.warn("Failed to fetch MXE key, using mocked/fallback or retrying...");
            // Fatal for real encryption
            throw new Error("MXE Public Key not found (Cluster might be unstable)");
        }

        if (!mxePubkeyBytes) throw new Error("MXE Public Key not found");

        // 2. ECDH Key Exchange
        const ephemeralPrivKey = x25519.utils.randomPrivateKey();
        const ephemeralPubKey = x25519.getPublicKey(ephemeralPrivKey);

        const sharedSecret = x25519.getSharedSecret(ephemeralPrivKey, mxePubkeyBytes);

        // 3. Encrypt
        // Use a nonce (zero for MVP/PoC, random for prod)
        const nonce = new Uint8Array(16).fill(0);
        const cipher = new RescueCipher(sharedSecret);

        // Helper to encrypt single field element (u64 fits in flexible field)
        const encryptField = (val: bigint) => {
            // encrypt returns number[][] (serialized 32-byte blocks)
            const encrypted = cipher.encrypt([val], nonce);
            return encrypted[0]; // First block
        };

        const bidLamports = BigInt(Math.floor(bidAmount * anchor.web3.LAMPORTS_PER_SOL));
        const minPriceLamports = BigInt(Math.floor(minPrice * anchor.web3.LAMPORTS_PER_SOL));

        console.log("Encrypting Bid:", bidLamports.toString());

        const encBid = encryptField(bidLamports);
        const encMin = encryptField(minPriceLamports);
        const encZero = encryptField(0n); // Padding or unused fields

        return {
            encryptedBid: encBid,
            encryptedMinPrice: encMin,
            encryptedZero: encZero,
            ephemeralPubKey: Array.from(ephemeralPubKey),
        };
    }
}


import * as anchor from "@coral-xyz/anchor";
import {
    getMXEAccAddress,
    getMXEPublicKey,
    getArciumProgram
} from "@arcium-hq/client";
import os from "os";
import path from "path";

async function main() {
    console.log("🔍 Verifying MXE Status for Frontend...");

    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(os.homedir(), ".config", "solana", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const ARCIUM_PROGRAM_ID = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");

    const mxePda = getMXEAccAddress(ARCIUM_PROGRAM_ID);
    console.log("MXE Address:", mxePda.toBase58());

    // 1. Check Account Existence
    const acc = await provider.connection.getAccountInfo(mxePda);
    if (!acc) {
        console.log("❌ MXE Account does not exist on chain.");
        console.log("   Frontend will NOT work.");
        return;
    }
    console.log("✅ MXE Account exists. (Part 1 was successful)");

    // 2. Check Public Key (Required for encryption)
    console.log("Attempting to fetch MXE Public Key...");
    try {
        const pubkey = await getMXEPublicKey(provider, ARCIUM_PROGRAM_ID);
        if (pubkey && pubkey.length > 0) {
            console.log("✅ MXE Public Key found:", Buffer.from(pubkey).toString('hex'));
            console.log("🚀 Frontend SHOULD work! The initialization failure might be harmless or re-init noise.");
        } else {
            console.log("❌ MXE Public Key is missing/empty.");
            console.log("   Part 2 (Keygen) likely failed significantly.");
        }
    } catch (e: any) {
        console.log("❌ Failed to fetch Public Key:", e.message);
    }
}

main().catch(console.error);

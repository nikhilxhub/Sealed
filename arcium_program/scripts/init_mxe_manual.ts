/**
 * Manual MXE initialization with explicit encoding
 * Bypasses the @arcium-hq/client to avoid encoding issues
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
    getCompDefAccOffset,
    getMXEAccAddress,
    getClusterAccAddress,
    getArciumProgramId,
    getArciumAccountBaseSeed,
} from "@arcium-hq/client";
import path from "path";
import fs from "fs";

const ARCIUM_PROGRAM_ID = getArciumProgramId();

async function main() {
    console.log("🚀 Manual MXE Initialization with proper encoding...\n");

    const PROGRAM_ID = new PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");
    const CLUSTER_OFFSET = 456;

    // Setup connection with base64 encoding preference
    const connection = new anchor.web3.Connection(
        "https://api.devnet.solana.com",
        { commitment: "confirmed" }
    );

    // Load wallet
    const walletPath = path.join(__dirname, "..", "id.json");
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const payer = anchor.web3.Keypair.fromSecretKey(new Uint8Array(walletData));
    console.log("Payer:", payer.publicKey.toBase58());

    // Check MXE account
    const mxeAddress = getMXEAccAddress(PROGRAM_ID);
    console.log("MXE Address:", mxeAddress.toBase58());

    const mxeInfo = await connection.getAccountInfo(mxeAddress);
    if (mxeInfo) {
        console.log("✅ MXE account already exists! Size:", mxeInfo.data.length);
        return;
    }

    // Get cluster info
    const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);
    console.log("Cluster:", clusterPda.toBase58());

    // Derive accounts
    const [keygenCompDef] = PublicKey.findProgramAddressSync(
        [getArciumAccountBaseSeed("ComputationDefinitionAccount"), ARCIUM_PROGRAM_ID.toBuffer(), getCompDefAccOffset("keygen")],
        ARCIUM_PROGRAM_ID
    );

    const [keyRecoveryCompDef] = PublicKey.findProgramAddressSync(
        [getArciumAccountBaseSeed("ComputationDefinitionAccount"), ARCIUM_PROGRAM_ID.toBuffer(), getCompDefAccOffset("key_recovery_init")],
        ARCIUM_PROGRAM_ID
    );

    console.log("Keygen CompDef:", keygenCompDef.toBase58());
    console.log("KeyRecovery CompDef:", keyRecoveryCompDef.toBase58());

    // Try to get the MXE state
    // The issue might be that initMxePart1 needs to complete first for THIS specific program

    // Let's check what accounts exist
    const signerBaseSeed = Buffer.from("ArciumSignerAccount");
    const [signerPda] = PublicKey.findProgramAddressSync([signerBaseSeed], PROGRAM_ID);

    console.log("\nChecking required accounts:");
    console.log("  Signer PDA:", signerPda.toBase58());

    const signerInfo = await connection.getAccountInfo(signerPda);
    console.log("  Signer exists:", !!signerInfo);

    // Recovery cluster account seed
    const recoveryBaseSeed = getArciumAccountBaseSeed("RecoveryClusterAccount");
    const [recoveryClusterPda] = PublicKey.findProgramAddressSync(
        [recoveryBaseSeed, PROGRAM_ID.toBuffer()],
        ARCIUM_PROGRAM_ID
    );
    console.log("  Recovery Cluster PDA:", recoveryClusterPda.toBase58());

    const recoveryInfo = await connection.getAccountInfo(recoveryClusterPda);
    console.log("  Recovery Cluster exists:", !!recoveryInfo);

    // The CBYqbAa account
    const otherAccount = new PublicKey("CBYqbAaiSWWrYFrnwx2f8Bhco4DBMjuBQvWYy2M8s7CH");
    const otherInfo = await connection.getAccountInfo(otherAccount);
    console.log("  CBYqbAa account exists:", !!otherInfo);

    // Check if maybe we need to derive the recovery cluster differently
    // Let's check what seed produces CBYqbAa
    console.log("\n🔍 Trying to identify CBYqbAa derivation...");

    // Try different seeds
    const testSeeds = [
        [Buffer.from("recovery_cluster")],
        [Buffer.from("RecoveryCluster")],
        [getArciumAccountBaseSeed("RecoveryClusterAccount")],
    ];

    for (const seeds of testSeeds) {
        try {
            const [derived] = PublicKey.findProgramAddressSync(seeds, ARCIUM_PROGRAM_ID);
            if (derived.equals(otherAccount)) {
                console.log("  Found! Seeds:", seeds.map(s => s.toString()));
            }
        } catch {}
    }

    // The real fix: we need to either:
    // 1. Use arcium CLI with correct Solana/RPC version
    // 2. Or redeploy the program fresh with arcium deploy

    console.log("\n❌ Manual initialization is complex.");
    console.log("The Arcium MXE setup requires specific account creation order.");
    console.log("\nRecommended solutions:");
    console.log("1. Redeploy using: arcium deploy (from Docker container with correct toolchain)");
    console.log("2. Or contact Arcium team for help with devnet MXE initialization");
}

main().catch(console.error);

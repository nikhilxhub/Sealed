/**
 * Direct MXE initialization using @arcium-hq/client
 * This bypasses the arcium CLI to avoid encoding issues
 */
import * as anchor from "@coral-xyz/anchor";
import {
    initMxePart1,
    initMxePart2,
    getCompDefAccOffset,
    getMXEAccAddress,
    getClusterAccAddress,
    getArciumProgram,
    getMXEPublicKey,
} from "@arcium-hq/client";
import path from "path";

async function main() {
    console.log("🚀 Direct MXE Initialization...\n");

    // Configuration
    const PROGRAM_ID = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");
    const CLUSTER_OFFSET = 456;
    const RECOVERY_SET_SIZE = 2;

    // Setup provider with explicit encoding config
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(__dirname, "..", "id.json");

    const connection = new anchor.web3.Connection(
        "https://api.devnet.solana.com",
        {
            commitment: "confirmed",
            // Force base64 encoding for large data
        }
    );

    const walletPath = path.join(__dirname, "..", "id.json");
    console.log("Using wallet:", walletPath);

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const mxeAddress = getMXEAccAddress(PROGRAM_ID);
    console.log("MXE Address:", mxeAddress.toBase58());

    // Check if MXE already exists
    const mxeInfo = await connection.getAccountInfo(mxeAddress);
    if (mxeInfo) {
        console.log("✅ MXE account already exists!");
        console.log("   Size:", mxeInfo.data.length, "bytes");

        // Try to get the public key
        try {
            const pubkey = await getMXEPublicKey(provider, PROGRAM_ID);
            if (pubkey && pubkey.some(b => b !== 0)) {
                console.log("✅ MXE keygen complete! Public key available.");
                console.log("   Pubkey:", Buffer.from(pubkey).toString('hex').slice(0, 32) + "...");
                return;
            } else {
                console.log("⏳ MXE exists but keygen not complete yet...");
            }
        } catch (e) {
            console.log("⏳ MXE exists but keygen in progress...");
        }
        return;
    }

    // Step 1: Init MXE Part 1
    console.log("\n📦 Step 1: Initializing MXE Part 1...");
    try {
        const sig1 = await initMxePart1(provider, PROGRAM_ID);
        console.log("   ✅ Part 1 tx:", sig1);
    } catch (e: any) {
        if (e.message?.includes("already in use") || e.logs?.some((l: string) => l.includes("already in use"))) {
            console.log("   ✅ Part 1 already done.");
        } else {
            console.error("   ❌ Part 1 failed:", e.message);
            throw e;
        }
    }

    // Step 2: Get cluster info for recovery peers
    console.log("\n📦 Step 2: Fetching cluster info...");
    const arciumCore = getArciumProgram(provider);
    const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);
    const clusterAcc: any = await arciumCore.account.cluster.fetch(clusterPda);

    const nodes = clusterAcc.nodes || [];
    console.log("   Cluster nodes:", nodes.length);

    // Get node offsets
    const nodeOffsets = nodes.map((n: any) => n.offset);
    console.log("   Node offsets:", nodeOffsets);

    // Pad or trim to recovery set size
    const recoveryPeers: number[] = [];
    for (let i = 0; i < RECOVERY_SET_SIZE; i++) {
        recoveryPeers.push(nodeOffsets[i] || 0);
    }
    console.log("   Recovery peers:", recoveryPeers);

    // Step 3: Get keygen offsets
    const keygenOffset = new anchor.BN(getCompDefAccOffset("keygen"), "le");
    const recOffset = new anchor.BN(getCompDefAccOffset("key_recovery_init"), "le");

    console.log("   Keygen offset:", keygenOffset.toString());
    console.log("   Recovery offset:", recOffset.toString());

    // Step 4: Init MXE Part 2
    console.log("\n📦 Step 3: Initializing MXE Part 2...");
    try {
        const sig2 = await initMxePart2(
            provider,
            CLUSTER_OFFSET,
            PROGRAM_ID,
            recoveryPeers,
            keygenOffset,
            recOffset
        );
        console.log("   ✅ Part 2 tx:", sig2);
        console.log("\n🎉 MXE Initialized! Keygen will take a few minutes...");
    } catch (e: any) {
        console.error("   ❌ Part 2 failed:", e.message);
        if (e.logs) {
            console.log("   Logs:", e.logs.slice(-5));
        }
        throw e;
    }
}

main().catch(console.error);

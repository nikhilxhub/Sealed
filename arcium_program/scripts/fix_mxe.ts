/**
 * Fix MXE initialization by trying different recovery set sizes
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
    console.log("🔧 MXE Fix Script - Trying different recovery set sizes...\n");

    const PROGRAM_ID = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");
    const CLUSTER_OFFSET = 456;

    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(__dirname, "..", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const mxeAddress = getMXEAccAddress(PROGRAM_ID);
    console.log("MXE Address:", mxeAddress.toBase58());

    // Check if already exists
    const mxeInfo = await provider.connection.getAccountInfo(mxeAddress);
    if (mxeInfo) {
        console.log("✅ MXE already exists!");
        try {
            const pubkey = await getMXEPublicKey(provider, PROGRAM_ID);
            if (pubkey && pubkey.some(b => b !== 0)) {
                console.log("✅ Keygen complete! You can now submit bids.");
                return;
            }
            console.log("⏳ Keygen in progress, wait a few minutes...");
        } catch {
            console.log("⏳ Keygen in progress...");
        }
        return;
    }

    // Get cluster info
    const arciumCore = getArciumProgram(provider);
    const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);
    const clusterAcc: any = await arciumCore.account.cluster.fetch(clusterPda);
    const nodes = clusterAcc.nodes || [];
    const nodeOffsets = nodes.map((n: any) => n.offset);

    console.log("Cluster nodes:", nodes.length);
    console.log("Node offsets:", nodeOffsets);

    // Get offsets
    const keygenOffset = new anchor.BN(getCompDefAccOffset("keygen"), "le");
    const recOffset = new anchor.BN(getCompDefAccOffset("key_recovery_init"), "le");

    // Try different recovery set sizes
    const sizesToTry = [1, 2, 3, 4, nodes.length];

    for (const size of sizesToTry) {
        console.log(`\n--- Trying recovery_set_size = ${size} ---`);

        // Build recovery peers array
        const recoveryPeers: number[] = [];
        for (let i = 0; i < size; i++) {
            recoveryPeers.push(nodeOffsets[i % nodeOffsets.length] || 0);
        }
        console.log("Recovery peers:", recoveryPeers);

        try {
            const sig = await initMxePart2(
                provider,
                CLUSTER_OFFSET,
                PROGRAM_ID,
                recoveryPeers,
                keygenOffset,
                recOffset
            );
            console.log("✅ SUCCESS with size", size);
            console.log("Tx:", sig);
            console.log("\n🎉 MXE Initialized! Wait 2-5 minutes for keygen to complete.");
            return;
        } catch (e: any) {
            const msg = e.message || "";
            if (msg.includes("InvalidRecoveryPeersCount")) {
                console.log("❌ Size", size, "rejected - InvalidRecoveryPeersCount");
            } else if (msg.includes("already in use")) {
                console.log("⏭️ Account already exists, trying next...");
            } else {
                console.log("❌ Error:", msg.slice(0, 100));
            }
        }
    }

    console.log("\n❌ All sizes failed. The cluster may require a specific recovery set size.");
    console.log("Contact Arcium team or try a different cluster.");
}

main().catch(console.error);

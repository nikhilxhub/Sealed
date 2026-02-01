
import * as anchor from "@coral-xyz/anchor";
import {
    initMxePart1,
    initMxePart2,
    getCompDefAccOffset,
} from "@arcium-hq/client";
import os from "os";

async function main() {
    process.env.ANCHOR_PROVIDER_URL = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = process.env.ANCHOR_WALLET || os.homedir() + "/.config/solana/id.json";

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Your Program ID
    const mxeProgramId = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");
    const clusterOffset = 456; // Devnet cluster offset (from Arcium.toml)

    console.log("Initializing MXE Part 1...");
    try {
        const sig1 = await initMxePart1(provider, mxeProgramId);
        console.log("Part 1 complete:", sig1);
    } catch (e: any) {
        if (e.message?.includes("already initialized") || e.logs?.some((l: string) => l.includes("already initialized"))) {
            console.log("MXE Part 1 likely already done or account exists.");
        } else {
            console.error("Part 1 error:", e);
            // throw e; // Continuation might be possible if only Part 1 was done
        }
    }

    // Convert Uint8Array offsets to BN
    // getCompDefAccOffset returns valid bytes for BN
    const keygenParams = getCompDefAccOffset("keygen");
    const keygenOffset = new anchor.BN(keygenParams, "le");

    const recParams = getCompDefAccOffset("key_recovery_init");
    const recOffset = new anchor.BN(recParams, "le");

    // Recovery peers: 100 zeros (unused for single node test)
    const recoveryPeers = new Array(100).fill(0);

    console.log("Initializing MXE Part 2...");
    try {
        const sig2 = await initMxePart2(
            provider,
            clusterOffset,
            mxeProgramId,
            recoveryPeers,
            keygenOffset,
            recOffset
        );
        console.log("Part 2 complete:", sig2);
    } catch (e: any) {
        console.error("Part 2 error:", e);
    }
}

main().catch(console.error);

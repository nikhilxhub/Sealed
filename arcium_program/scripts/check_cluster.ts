
import * as anchor from "@coral-xyz/anchor";
import {
    getClusterAccAddress,
    getArciumProgram,
    ARCIUM_ADDR
} from "@arcium-hq/client";
import os from "os";
import path from "path";

async function main() {
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(os.homedir(), ".config", "solana", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const arciumProgram = getArciumProgram(provider);
    const CLUSTER_PROGRAM_ID = new anchor.web3.PublicKey("Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ");

    // We manually fetch the Cluster account structure because we might not have the IDL loaded for `arcium_program` var above if it comes from SDK generic.
    // Actually, `getArciumProgram` returns a Program instance.

    console.log("Checking Arcium Clusters on Devnet...");

    const offsetsToCheck = [123, 456, 789];

    for (const offset of offsetsToCheck) {
        try {
            const clusterPda = getClusterAccAddress(offset);
            console.log(`\n--- Checking Cluster ${offset} at: ${clusterPda.toBase58()} ---`);

            // We use standard Fetch
            // If getArciumProgram doesn't have the "Cluster" account definition, this fails.
            // But usually it does.
            const clusterAcc = await arciumProgram.account.cluster.fetch(clusterPda);

            if (clusterAcc) {
                console.log("Cluster Found!");
                // @ts-ignore
                const nodes = clusterAcc.nodes;
                // @ts-ignore
                console.log(`Nodes: ${nodes.length}`);

                if (nodes.length > 0) {
                    console.log("✅ Cluster is ACTIVE!");
                    // We found a good one
                } else {
                    console.log("❌ Cluster is empty.");
                }
            }
        } catch (e: any) {
            console.log("Cluster not found or error:", e.message);
        }
    }
}

main().catch(console.error);

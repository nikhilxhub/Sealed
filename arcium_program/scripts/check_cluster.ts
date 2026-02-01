import * as anchor from "@coral-xyz/anchor";
import {
    getClusterAccAddress,
    getArciumProgram,
    getMXEAccAddress,
} from "@arcium-hq/client";
import path from "path";

async function main() {
    const CLUSTER_OFFSET = 456;
    const PROGRAM_ID = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");

    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(__dirname, "..", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const arciumCore = getArciumProgram(provider);

    // Check cluster account
    const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);
    console.log("Cluster PDA:", clusterPda.toBase58());

    try {
        const clusterAcc: any = await arciumCore.account.cluster.fetch(clusterPda);
        console.log("\n=== Cluster Info ===");
        console.log("Cluster size:", clusterAcc.clusterSize?.toString() || clusterAcc.cluster_size?.toString());
        console.log("Max capacity:", clusterAcc.maxCapacity?.toString());
        console.log("CU price:", clusterAcc.cuPrice?.toString());
        console.log("Authority:", clusterAcc.authority?.toBase58());
        console.log("Bump:", clusterAcc.bump);

        console.log("\n=== Nodes ===");
        const nodes = clusterAcc.nodes || [];
        console.log("Node count:", nodes.length);
        nodes.forEach((node: any, i: number) => {
            console.log(`  Node ${i}: offset=${node.offset}, rewards=${node.currentTotalRewards?.toString()}`);
        });

        console.log("\n=== Pending Nodes ===");
        console.log("Pending:", clusterAcc.pendingNodes);

        console.log("\n=== BLS Public Key ===");
        console.log("BLS key status:", JSON.stringify(clusterAcc.blsPublicKey).slice(0, 100) + "...");

        // Check activation
        console.log("\n=== Activation ===");
        if (clusterAcc.activation) {
            console.log("Activation epoch:", clusterAcc.activation.activationEpoch?.toString());
            console.log("Deactivation epoch:", clusterAcc.activation.deactivationEpoch?.toString());
        }

    } catch (e: any) {
        console.error("Error fetching cluster:", e.message);
    }

    // Check MXE signer account (Part 1 creates this)
    const signerPda = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("ArciumSignerAccount")],
        PROGRAM_ID
    )[0];
    console.log("\n=== MXE Signer Account (Part 1) ===");
    console.log("Signer PDA:", signerPda.toBase58());

    const signerInfo = await provider.connection.getAccountInfo(signerPda);
    if (signerInfo) {
        console.log("Exists: YES");
        console.log("Owner:", signerInfo.owner.toBase58());
        console.log("Size:", signerInfo.data.length);
    } else {
        console.log("Exists: NO");
    }

    // Check the account that Part 1 actually creates (CBYqbAa...)
    const otherAccount = new anchor.web3.PublicKey("CBYqbAaiSWWrYFrnwx2f8Bhco4DBMjuBQvWYy2M8s7CH");
    console.log("\n=== Part 1 Created Account ===");
    console.log("Address:", otherAccount.toBase58());

    const otherInfo = await provider.connection.getAccountInfo(otherAccount);
    if (otherInfo) {
        console.log("Exists: YES");
        console.log("Owner:", otherInfo.owner.toBase58());
        console.log("Size:", otherInfo.data.length, "bytes");
    } else {
        console.log("Exists: NO");
    }

    // Check MXE main account
    const mxePda = getMXEAccAddress(PROGRAM_ID);
    console.log("\n=== MXE Main Account ===");
    console.log("MXE PDA:", mxePda.toBase58());

    const mxeInfo = await provider.connection.getAccountInfo(mxePda);
    if (mxeInfo) {
        console.log("Exists: YES");
        console.log("Owner:", mxeInfo.owner.toBase58());
        console.log("Size:", mxeInfo.data.length);
    } else {
        console.log("Exists: NO - Part 2 not completed");
    }
}

main().catch(console.error);


import * as anchor from "@coral-xyz/anchor";
import {
    initMxePart1,
    initMxePart2,
    getCompDefAccOffset,
    getMXEAccAddress,
    getClusterAccAddress,
    getCompDefAccAddress,
    getArciumProgram
} from "@arcium-hq/client";
import os from "os";
import path from "path";
import fs from "fs";

// IDL for the user's Arcium Program (wrapper)
import arciumProgramIdl from "../target/idl/arcium_program.json";

async function main() {
    console.log("🚀 Initializing Arcium Devnet Environment...");

    // 1. Setup Provider (Devnet)
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(os.homedir(), ".config", "solana", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // 2. Constants
    const ARCIUM_PROGRAM_ID = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");
    const ARCIUM_CORE_PID = new anchor.web3.PublicKey("Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ");

    const CLUSTER_OFFSET = 456; // Verified Active Cluster

    // 3. Initialize MXE
    const mxePda = getMXEAccAddress(ARCIUM_PROGRAM_ID);
    console.log("Checking MXE:", mxePda.toBase58());

    console.log("⚙️ Initializing MXE...");
    try {
        const sig1 = await initMxePart1(provider, ARCIUM_PROGRAM_ID);
        console.log("   - MXE Part 1 tx:", sig1);
    } catch (e: any) {
        if (JSON.stringify(e).includes("0x0") || e.toString().includes("already in use")) {
            console.log("   - MXE Part 1: Already initialized (or conflict).");
        } else {
            console.log("   - MXE Part 1 status:", e.message);
        }
    }

    try {
        const keygenParams = getCompDefAccOffset("keygen");
        const keygenOffset = new anchor.BN(keygenParams, "le");

        const recParams = getCompDefAccOffset("key_recovery_init");
        const recOffset = new anchor.BN(recParams, "le");

        // DYNAMIC FIX: Fetch cluster to get correct SIZE
        const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);
        const arciumCore = getArciumProgram(provider);

        console.log(`   - Fetching Cluster ${CLUSTER_OFFSET} info...`);
        const clusterAcc: any = await arciumCore.account.cluster.fetch(clusterPda);

        // Debug active nodes
        const activeNodes = clusterAcc.nodes ? clusterAcc.nodes.length : 0;
        console.log(`   - Active Nodes: ${activeNodes}`);

        // Correct Field is 'clusterSize' (u16)
        // Access via camelCase usually: clusterSize
        // Could be snake_case in raw IDL decode: cluster_size

        // Safe access helper
        const sizeField = clusterAcc.clusterSize || clusterAcc.cluster_size || clusterAcc.size;

        let requiredPeers = 0;
        if (sizeField) {
            if (typeof sizeField.toNumber === 'function') {
                requiredPeers = sizeField.toNumber();
            } else {
                requiredPeers = Number(sizeField);
            }
        } else {
            // Fallback
            console.warn("⚠️ 'clusterSize' property missing, using active node count.");
            requiredPeers = activeNodes;
        }

        console.log(`   - Required Recovery Peers (from Cluster Size): ${requiredPeers}`);

        if (Number.isNaN(requiredPeers) || requiredPeers === 0) {
            requiredPeers = 3; // Hard fallback for typical Devnet cluster? or 2?
            console.warn(`⚠️ Parsed invalid. Defaulting to ${requiredPeers}.`);
        }

        // Create recovery peers matching correct size
        const recoveryPeers = new Array(requiredPeers).fill(0);

        const sig2 = await initMxePart2(
            provider,
            CLUSTER_OFFSET,
            ARCIUM_PROGRAM_ID,
            recoveryPeers,
            keygenOffset,
            recOffset
        );
        console.log("   - MXE Part 2 tx:", sig2);
        console.log("✅ MXE Initialized.");
    } catch (e: any) {
        if (JSON.stringify(e).includes("0x0") || e.toString().includes("already in use")) {
            console.log("   - MXE Part 2: Already initialized.");
        } else {
            console.error("❌ MXE Init Part 2 Failed:", e);
        }
    }

    // 4. Initialize Computation Definitions (CompDefs)
    const program = new anchor.Program(arciumProgramIdl as any, provider);

    const compDefs = ["submit_bid", "reveal_winner"];

    for (const name of compDefs) {
        console.log(`\n⚙️ Initializing CompDef: ${name}...`);

        const methodSnake = `init_${name}_comp_def`;
        const methodCamel = `init${toPascalCase(name)}CompDef`;
        let methodBuilder = program.methods[methodCamel] || program.methods[methodSnake];

        if (!methodBuilder) {
            console.log(`⚠️ Method ${methodSnake}/${methodCamel} not found. Skipping.`);
            continue;
        }

        try {
            const offsetBytes = getCompDefAccOffset(name);
            const offsetBn = new anchor.BN(offsetBytes, "le");

            const compDefAddr = getCompDefAccAddress(ARCIUM_PROGRAM_ID, offsetBn as any);
            console.log(`   - CompDef Address: ${compDefAddr.toBase58()}`);

            const tx = await methodBuilder()
                .accounts({
                    payer: provider.publicKey,
                    mxeAccount: mxePda,
                    compDefAccount: compDefAddr,
                    arciumProgram: ARCIUM_CORE_PID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();
            console.log(`   - Init tx: ${tx}`);
            console.log(`✅ CompDef '${name}' Initialized.`);
        } catch (e: any) {
            if (e.message?.includes("already in use") || e.message?.includes("0x0") || e.logs?.some((l: any) => l.includes("already in use"))) {
                console.log(`✅ CompDef '${name}' already exists.`);
            } else {
                console.log(`ℹ️ Init '${name}' failed:`, e.message);
            }
        }
    }

    const clusterPda = getClusterAccAddress(CLUSTER_OFFSET);

    // 5. Output Config
    const config = {
        ARCIUM_PROGRAM_ID: ARCIUM_PROGRAM_ID.toBase58(),
        CLUSTER_OFFSET: CLUSTER_OFFSET,
        MXE_ACCOUNT: mxePda.toBase58(),
        CLUSTER_ACCOUNT: clusterPda.toBase58(),
    };

    console.log("\nDATA FOR FRONTEND:");
    console.log(JSON.stringify(config, null, 2));
}

function toPascalCase(str: string) {
    return str.replace(/_(\w)/g, (g0, g1) => g1.toUpperCase())
        .replace(/^(\w)/, (g0, g1) => g1.toUpperCase());
}

main().catch(console.error);

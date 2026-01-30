
import * as anchor from "@coral-xyz/anchor";
import {
    getCompDefAccOffset,
    getCompDefAccAddress,
    getMXEAccAddress,
} from "@arcium-hq/client";
import os from "os";
import path from "path";

// IDL for the user's Arcium Program (wrapper)
import arciumProgramIdl from "../target/idl/arcium_program.json";

async function main() {
    console.log("🚀 Initializing Arcium Computation Definitions ONLY...");

    // 1. Setup Provider (Devnet)
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(os.homedir(), ".config", "solana", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // 2. Constants (Hardcoded from existing Devnet Infra)
    const ARCIUM_PROGRAM_ID = new anchor.web3.PublicKey("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");
    const ARCIUM_CORE_PID = new anchor.web3.PublicKey("Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ");

    // EXISTING Accounts (Do not re-init these)
    // Derived Accounts
    const MXE_ACCOUNT = getMXEAccAddress(ARCIUM_PROGRAM_ID);
    const CLUSTER_ACCOUNT = new anchor.web3.PublicKey("DzaQCyfybroycrNqE5Gk7LhSbWD2qfCics6qptBFbr95");

    console.log(`Using Existing MXE: ${MXE_ACCOUNT.toBase58()}`);

    // 3. Initialize ONLY CompDefs
    const program = new anchor.Program(arciumProgramIdl as any, provider);
    const compDefs = ["submit_bid", "reveal_winner"];

    for (const name of compDefs) {
        console.log(`\n⚙️ Registering CompDef: ${name}...`);

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
                    mxeAccount: MXE_ACCOUNT, // Pass existing MXE
                    compDefAccount: compDefAddr,
                    arciumProgram: ARCIUM_CORE_PID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();
            console.log(`   - Init tx: ${tx}`);
            console.log(`✅ CompDef '${name}' Registered.`);
        } catch (e: any) {
            // Check for "already initialized" or similar errors
            if (e.message?.includes("already in use") || e.message?.includes("0x0") || e.logs?.some((l: any) => l.includes("already in use"))) {
                console.log(`✅ CompDef '${name}' already exists.`);
            } else {
                console.log(`❌ Init '${name}' failed:`);
                console.log(e);
            }
        }
    }

    // 4. Final Config Output
    const config = {
        ARCIUM_PROGRAM_ID: ARCIUM_PROGRAM_ID.toBase58(),
        MXE_ACCOUNT: MXE_ACCOUNT.toBase58(),
        CLUSTER_ACCOUNT: CLUSTER_ACCOUNT.toBase58(),
    };

    console.log("\nDATA FOR FRONTEND (Copy this to app/utils/arcium.ts):");
    console.log(JSON.stringify(config, null, 2));
}

function toPascalCase(str: string) {
    return str.replace(/_(\w)/g, (g0, g1) => g1.toUpperCase())
        .replace(/^(\w)/, (g0, g1) => g1.toUpperCase());
}

main().catch(console.error);

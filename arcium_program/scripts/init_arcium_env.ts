import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { ArciumProgram } from "../target/types/arcium_program";
import * as fs from "fs";
import * as os from "os";
import {
    getArciumEnv,
    getCompDefAccOffset,
    getArciumAccountBaseSeed,
    getArciumProgramId,
    buildFinalizeCompDefTx,
    getMXEPublicKey,
    getMXEAccAddress,
    getClusterAccAddress,
} from "@arcium-hq/client";

async function main() {
    // 1. Setup Provider - Set env vars BEFORE calling AnchorProvider.env()
    const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
    const walletPath = process.env.ANCHOR_WALLET || os.homedir() + "/.config/solana/id.json";

    // Set environment variables for Arcium client
    process.env.ANCHOR_PROVIDER_URL = rpcUrl;
    process.env.ANCHOR_WALLET = walletPath;
    process.env.ARCIUM_CLUSTER_OFFSET = process.env.ARCIUM_CLUSTER_OFFSET || "456"; // Devnet cluster offset

    // Create provider manually to avoid AnchorProvider.env() issues
    const connection = new Connection(rpcUrl, "confirmed");
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
    );
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);
    const program = anchor.workspace.ArciumProgram as Program<ArciumProgram>;
    const wallet = provider.wallet as anchor.Wallet;

    console.log("Initializing Arcium Runtime for Sealed Auction...");

    // 2. Fetch/Derive MXE and Cluster Accounts
    // Note: These usually exist on the network (Devnet/Localnet) if the Arcium infra is running.
    // If running locally, ArciumEnv defaults help here.
    const arciumEnv = getArciumEnv();
    const mxeAddress = getMXEAccAddress(program.programId); // Derived from our program ID
    const clusterAddress = getClusterAccAddress(arciumEnv.arciumClusterOffset);

    console.log("MXE Account:", mxeAddress.toBase58());
    console.log("Cluster Account:", clusterAddress.toBase58());

    // 3. Initialize 'submit_bid' Computation Definition
    await initCompDef(program, wallet.payer, "submit_bid");

    // 4. Initialize 'reveal_winner' Computation Definition
    await initCompDef(program, wallet.payer, "reveal_winner");

    console.log("\n--- CONFIGURATION FOR FRONTEND ---");
    console.log(`export const ARCIUM_CONFIG = {`);
    console.log(`  mxe: new PublicKey("${mxeAddress.toBase58()}"),`);
    console.log(`  cluster: new PublicKey("${clusterAddress.toBase58()}"),`);
    console.log(`  compDefSubmitBid: new PublicKey("${getCompDefAddress(program.programId, "submit_bid").toBase58()}"),`);
    console.log(`  compDefRevealWinner: new PublicKey("${getCompDefAddress(program.programId, "reveal_winner").toBase58()}"),`);
    console.log(`};`);
}

async function initCompDef(
    program: Program<ArciumProgram>,
    payer: anchor.web3.Keypair,
    compDefName: string
) {
    const methodMap: Record<string, string> = {
        "submit_bid": "initSubmitBidCompDef",
        "reveal_winner": "initRevealWinnerCompDef"
    };
    const methodName = methodMap[compDefName];
    if (!methodName) throw new Error(`Unknown comp def: ${compDefName}`);

    console.log(`\nInitializing ${compDefName}...`);

    const offset = getCompDefAccOffset(compDefName);
    const compDefPDA = getCompDefAddress(program.programId, compDefName);

    try {
        // @ts-ignore - dynamic method call
        const sig = await program.methods[methodName]()
            .accounts({
                compDefAccount: compDefPDA,
                payer: payer.publicKey,
                mxeAccount: getMXEAccAddress(program.programId),
            })
            .rpc({ commitment: "confirmed" });
        console.log(`Initialized PDA: ${sig}`);
    } catch (e: any) {
        if (e.message?.includes("already in use")) {
            console.log("Acc already initialized, skipping init step.");
        } else {
            throw e;
        }
    }

    // Finalize (Required to make it usable)
    console.log("Finalizing...");
    const finalizeTx = await buildFinalizeCompDefTx(
        program.provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId,
    );

    const latestBlockhash = await program.provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(payer);

    try {
        const txId = await program.provider.sendAndConfirm(finalizeTx);
        console.log(`Finalized: ${txId}`);
    } catch (e) {
        console.log("Finalization step failed (might be already finalized).");
    }
}

function getCompDefAddress(programId: PublicKey, name: string): PublicKey {
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset(name);
    return PublicKey.findProgramAddressSync(
        [baseSeed, programId.toBuffer(), offset],
        getArciumProgramId()
    )[0];
}

main().catch(console.error);

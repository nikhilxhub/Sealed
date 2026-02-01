/**
 * Decode the CBYqbAa account to understand what it is
 */
import * as anchor from "@coral-xyz/anchor";
import { getArciumProgram } from "@arcium-hq/client";
import path from "path";

async function main() {
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = path.join(__dirname, "..", "id.json");

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const arciumCore = getArciumProgram(provider);
    const accountPubkey = new anchor.web3.PublicKey("CBYqbAaiSWWrYFrnwx2f8Bhco4DBMjuBQvWYy2M8s7CH");

    console.log("Checking account:", accountPubkey.toBase58());

    const accountInfo = await provider.connection.getAccountInfo(accountPubkey);
    if (!accountInfo) {
        console.log("Account does not exist");
        return;
    }

    console.log("Owner:", accountInfo.owner.toBase58());
    console.log("Size:", accountInfo.data.length, "bytes");
    console.log("Lamports:", accountInfo.lamports);

    // Try to decode as different account types
    const accountTypes = [
        'computationDefinitionAccount',
        'mxeAccount',
        'cluster',
        'computation',
        'feePool',
        'clockAccount',
    ];

    for (const accType of accountTypes) {
        try {
            // @ts-ignore
            const decoded = await arciumCore.account[accType].fetch(accountPubkey);
            console.log(`\n✅ Decoded as: ${accType}`);
            console.log(JSON.stringify(decoded, (key, value) => {
                if (typeof value === 'bigint') return value.toString();
                if (value?.toBase58) return value.toBase58();
                if (value?.toString && value._bn) return value.toString();
                if (Array.isArray(value) && value.length > 10) return `[Array of ${value.length} items]`;
                return value;
            }, 2).slice(0, 1000) + "...");
            break;
        } catch (e) {
            // Not this type
        }
    }

    // Print first 64 bytes as hex for discriminator analysis
    console.log("\nFirst 64 bytes (hex):");
    console.log(Buffer.from(accountInfo.data.slice(0, 64)).toString('hex'));

    // Print discriminator (first 8 bytes)
    console.log("\nDiscriminator:", Buffer.from(accountInfo.data.slice(0, 8)).toString('hex'));
}

main().catch(console.error);

import { getMXEAccAddress, getArciumProgramId, getMXEPublicKey } from '@arcium-hq/client';
import { PublicKey, Connection } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import path from "path";

async function main() {
    const PROGRAM_ID = new PublicKey('2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC');
    const mxeAddress = getMXEAccAddress(PROGRAM_ID);
    console.log('Program ID:', PROGRAM_ID.toBase58());
    console.log('MXE Account Address:', mxeAddress.toBase58());
    console.log('Arcium Core Program:', getArciumProgramId().toBase58());

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    const info = await connection.getAccountInfo(mxeAddress);
    if (info) {
        console.log('\n✅ MXE Account EXISTS');
        console.log('  Owner:', info.owner.toBase58());
        console.log('  Data length:', info.data.length, 'bytes');
        console.log('  Lamports:', info.lamports);

        // Try to get MXE public key
        process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
        // Use id.json from project directory
        process.env.ANCHOR_WALLET = path.join(__dirname, "..", "id.json");
        const provider = anchor.AnchorProvider.env();

        try {
            console.log('\nTrying to fetch MXE x25519 public key...');
            const mxePublicKey = await getMXEPublicKey(provider, PROGRAM_ID);
            if (mxePublicKey) {
                const isAllZeros = mxePublicKey.every(b => b === 0);
                if (isAllZeros) {
                    console.log('⚠️ MXE x25519 pubkey is all zeros - KEYGEN NOT COMPLETE');
                    console.log('   The ARX nodes are still performing distributed keygen.');
                    console.log('   Please wait a few minutes and try again.');
                } else {
                    console.log('✅ MXE x25519 pubkey:', Buffer.from(mxePublicKey).toString('hex'));
                    console.log('   KEYGEN COMPLETE - ready for encrypted computations!');
                }
            } else {
                console.log('⚠️ MXE x25519 pubkey is null - KEYGEN NOT STARTED');
            }
        } catch (e: any) {
            console.log('❌ Failed to get MXE public key:', e.message);
            console.log('   This likely means keygen has not completed yet.');
        }
    } else {
        console.log('\n❌ MXE Account DOES NOT EXIST');
        console.log('   Run: npx ts-node scripts/init_devnet.ts');
    }
}

main().catch(console.error);

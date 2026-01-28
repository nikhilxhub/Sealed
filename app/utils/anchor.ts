import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/app/idl/sealed_auction.json";
import { SealedAuction } from "@/app/types/sealed_auction";

export const PROGRAM_ID = new PublicKey(idl.address);

export const getProgram = (connection: Connection, wallet: any): Program<SealedAuction> => {
    const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
    );
    setProvider(provider);
    return new Program(idl as SealedAuction, provider);
};

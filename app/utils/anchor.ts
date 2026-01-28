import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/app/idl/sealed_auction.json";

export const PROGRAM_ID = new PublicKey(idl.address);

export const getProgram = (connection: Connection, wallet: any) => {
    const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
    );
    setProvider(provider);
    return new Program(idl as Idl, provider);
};

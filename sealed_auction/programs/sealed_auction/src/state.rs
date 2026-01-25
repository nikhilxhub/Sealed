use anchor_lang::prelude::*;

#[account]
pub struct Auction {
    pub seller: Pubkey,
    pub nft_mint: Pubkey,
    pub min_price: u64,
    pub end_time: i64,
    pub settled: bool,
    pub bid_count: u64,
    pub bump: u8,
}

#[account]
pub struct BidEscrow {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub max_locked_amount: u64,
    pub withdrawn: bool,
    pub bump: u8,
    pub ciphertext: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ArciumProof {
    pub message_hash: [u8; 32],
    pub signature: [u8; 64],
}

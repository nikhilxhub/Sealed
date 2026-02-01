use anchor_lang::prelude::*;

/// The Arcium program ID that owns AuctionResult accounts
pub const ARCIUM_PROGRAM_ID: Pubkey = pubkey!("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");

/// Seed for auction result PDA (must match arcium_program)
pub const AUCTION_RESULT_SEED: &[u8] = b"auction_result";

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
}

/// AuctionResult account created by arcium_program after reveal_winner
/// This is a cross-program account - we read it but don't own it
#[account]
pub struct AuctionResult {
    /// The auction this result belongs to
    pub auction_id: Pubkey,
    /// PDA bump
    pub bump: u8,
    /// Whether the result has been revealed
    pub revealed: bool,
    /// The winner's pubkey (plaintext)
    pub winner: Pubkey,
    /// The winning bid amount in lamports (plaintext)
    pub winning_amount: u64,
    /// Timestamp when revealed
    pub revealed_at: i64,
}

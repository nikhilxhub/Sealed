use anchor_lang::prelude::*;

#[error_code]
pub enum AuctionError {
    #[msg("Auction already ended")]
    AuctionEnded,

    #[msg("Auction not ended")]
    AuctionNotEnded,

    #[msg("Auction already settled")]
    AlreadySettled,

    #[msg("Invalid Arcium proof")]
    InvalidArciumProof,

    #[msg("Bid below minimum price")]
    BelowMinPrice,

    #[msg("Insufficient escrow")]
    InsufficientEscrow,
    
    #[msg("Funds already withdrawn")]
    AlreadyWithdrawn,

    #[msg("Cannot cancel auction after bids are placed")]
    BidsAlreadyPlaced,

    #[msg("Auction must be settled before refunds")]
    AuctionNotSettled,

    #[msg("Auction end time must be in the future")]
    InvalidEndTime,
}

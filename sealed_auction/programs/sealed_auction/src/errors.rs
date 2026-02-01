use anchor_lang::prelude::*;

#[error_code]
pub enum AuctionError {
    #[msg("Auction already ended")]
    AuctionEnded,

    #[msg("Auction not ended")]
    AuctionNotEnded,

    #[msg("Auction already settled")]
    AlreadySettled,

    #[msg("Invalid auction result account")]
    InvalidAuctionResult,

    #[msg("Auction result not revealed yet")]
    ResultNotRevealed,

    #[msg("Auction ID mismatch")]
    AuctionMismatch,

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

    #[msg("Minimum price must be greater than zero")]
    InvalidMinPrice,

    #[msg("No valid winner exists")]
    NoValidWinner,
}

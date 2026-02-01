use anchor_lang::prelude::*;
use crate::state::*;

/// Close a settled auction account to reclaim rent.
/// This is for cleaning up old settled auctions that weren't closed properly.
#[derive(Accounts)]
pub struct CloseSettled<'info> {
    /// Only the seller can close their auction
    #[account(mut, address = auction.seller)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.nft_mint.as_ref()],
        bump = auction.bump,
        constraint = auction.settled == true,
        close = seller,
    )]
    pub auction: Account<'info, Auction>,
}

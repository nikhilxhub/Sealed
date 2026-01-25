use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct RefundLoser<'info> {
    /// CHECK: Safe because we only transfer lamports to it. Anyone can crank the refund.
    #[account(mut)]
    pub bidder: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"bid_escrow", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_escrow.bump,
        constraint = bid_escrow.bidder == bidder.key(),
        constraint = bid_escrow.auction == auction.key(),
        close = bidder,
    )]
    pub bid_escrow: Account<'info, BidEscrow>,

    pub auction: Account<'info, Auction>,

    pub system_program: Program<'info, System>,
}

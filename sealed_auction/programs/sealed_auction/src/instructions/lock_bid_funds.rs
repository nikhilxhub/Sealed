use anchor_lang::prelude::*;
use crate::state::*;


#[derive(Accounts)]
#[instruction(max_locked_amount: u64)]
pub struct LockBidFunds<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        // Ensure auction is not ended is checked in logic
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        seeds = [b"bid_escrow", auction.key().as_ref(), bidder.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 8 + 1 + 1
    )]
    pub bid_escrow: Account<'info, BidEscrow>,

    pub system_program: Program<'info, System>,
}

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, Transfer};
use crate::state::*;


#[derive(Accounts)]
pub struct SettleAuction<'info> {
    /// CHECK: Safe because we only transfer lamports to it
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    /// CHECK: Safe because we only transfer lamports/NFT to it
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = seller,
        has_one = nft_mint,
    )]
    pub auction: Account<'info, Auction>,

    /// The auction result from arcium_program (cross-program account verification)
    /// Constraint: must be owned by ARCIUM_PROGRAM_ID
    #[account(
        seeds = [AUCTION_RESULT_SEED, auction.key().as_ref()],
        bump = auction_result.bump,
        seeds::program = ARCIUM_PROGRAM_ID,
    )]
    pub auction_result: Account<'info, AuctionResult>,

    #[account(
        mut,
        seeds = [b"bid_escrow", auction.key().as_ref(), winner.key().as_ref()],
        bump = winner_bid_escrow.bump,
        constraint = winner_bid_escrow.bidder == winner.key(),
        constraint = winner_bid_escrow.auction == auction.key(),
        close = winner,
    )]
    pub winner_bid_escrow: Account<'info, BidEscrow>,

    #[account(
        mut,
        token::mint = nft_mint,
        token::authority = auction
    )]
    pub nft_escrow_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = winner_nft_account.owner == winner.key(),
        constraint = winner_nft_account.mint == nft_mint.key(),
    )]
    pub winner_nft_account: Account<'info, TokenAccount>,

    pub nft_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> SettleAuction<'info> {
    pub fn into_transfer_to_winner(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.nft_escrow_account.to_account_info(),
            to: self.winner_nft_account.to_account_info(),
            authority: self.auction.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

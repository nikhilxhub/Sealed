use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};
use crate::state::*;

#[derive(Accounts)]
pub struct FinalizeNoWinner<'info> {
    /// Anyone can crank this - permissionless
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Safe - we verify this matches auction.seller
    #[account(mut, address = auction.seller)]
    pub seller: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.nft_mint.as_ref()],
        bump = auction.bump,
        // Note: Do NOT close here - auction must remain for refund_loser checks
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        token::mint = auction.nft_mint,
        token::authority = auction
    )]
    pub nft_escrow_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = seller_nft_account.owner == seller.key(),
        constraint = seller_nft_account.mint == auction.nft_mint
    )]
    pub seller_nft_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> FinalizeNoWinner<'info> {
    pub fn into_transfer_back_to_seller(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.nft_escrow_account.to_account_info(),
                to: self.seller_nft_account.to_account_info(),
                authority: self.auction.to_account_info(),
            },
        )
    }
}

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::*;

#[derive(Accounts)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub seller:Signer<'info>,

    #[account(
        init,
        payer = seller,
        seeds = [b"auction", nft_mint.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 1
    )]
    pub auction: Account<'info, Auction>,

    pub nft_mint: Account<'info, Mint>,

    #[account(mut)]
    pub seller_nft_account:Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        token::mint = nft_mint,
        token::authority = auction
    )]
    pub nft_escrow_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,    

}

impl<'info> CreateAuction<'info> {
    pub fn into_transfer_to_escrow(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.seller_nft_account.to_account_info(),
                to: self.nft_escrow_account.to_account_info(),
                authority: self.seller.to_account_info(),
            },
        )
    }
}


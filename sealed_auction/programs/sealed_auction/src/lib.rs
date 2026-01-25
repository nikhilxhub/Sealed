use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_lang::system_program;

mod state;
mod errors;
mod instructions;

use state::*;
use errors::*;
use instructions::*;


declare_id!("C84z4ATX6WPa9KVePmKpXHFnJwxu41nLJwvagsefxLkB");

pub const ARCIUM_VERIFIER:Pubkey = pubkey!("11111111111111111111111111111111");

#[program]
pub mod sealed_auction {
    use super::*;

    pub fn create_auction(
        ctx: Context<CreateAuction>,
        min_price: u64,
        end_time: i64,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let now = Clock::get()?.unix_timestamp;

        require!(end_time > now, AuctionError::InvalidEndTime);
        require!(min_price > 0, AuctionError::InvalidMinPrice);

        auction.seller = ctx.accounts.seller.key();
        auction.nft_mint = ctx.accounts.nft_mint.key();
        auction.min_price = min_price;
        auction.end_time = end_time;
        auction.settled = false;
        auction.bump = ctx.bumps.auction;

        // Move NFT to escrow
        token::transfer(
            ctx.accounts.into_transfer_to_escrow(),
            1,
        )?;

        Ok(())
    }

    pub fn lock_bid_funds(
        ctx: Context<LockBidFunds>,
        max_locked_amount: u64,
        ciphertext: Vec<u8>,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let now = Clock::get()?.unix_timestamp;

        require!(now < auction.end_time, AuctionError::AuctionEnded);

        auction.bid_count += 1;
        let escrow = &mut ctx.accounts.bid_escrow;
        escrow.auction = auction.key();
        escrow.bidder = ctx.accounts.bidder.key();
        escrow.max_locked_amount = max_locked_amount;
        escrow.withdrawn = false;
        escrow.bump = ctx.bumps.bid_escrow;
        escrow.ciphertext = ciphertext;

        // Transfer SOL into PDA via System Program
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.bidder.to_account_info(),
                    to: ctx.accounts.bid_escrow.to_account_info(),
                },
            ),
            max_locked_amount,
        )?;

        Ok(())
    }

    pub fn settle_auction(
        ctx: Context<SettleAuction>,
        winner: Pubkey,
        winning_amount: u64,
        proof: ArciumProof,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let now = Clock::get()?.unix_timestamp;

        require!(now > auction.end_time, AuctionError::AuctionNotEnded);
        require!(!auction.settled, AuctionError::AlreadySettled);

        // --- Verify Arcium Attestation ---
        // TODO: Implement proper hash and ed25519 verification. 
        // Note: solana_program types might need to be imported directly or logic revised for on-chain verification (e.g. Ed25519 Sig Verify IX).
        /*
        let expected_hash = anchor_lang::solana_program::hash::hashv(&[
            auction.key().as_ref(),
            winner.as_ref(),
            &winning_amount.to_le_bytes(),
        ]);

        require!(
            expected_hash.to_bytes() == proof.message_hash,
            AuctionError::InvalidArciumProof
        );

        let verified = anchor_lang::solana_program::ed25519_program::verify(
            &proof.signature,
            proof.message_hash.as_ref(),
            ARCIUM_VERIFIER.as_ref(),
        );

        require!(verified, AuctionError::InvalidArciumProof);
        */

        // --- Financial Safety ---
        require!(winning_amount >= auction.min_price, AuctionError::BelowMinPrice);
        require!(
            winning_amount <= ctx.accounts.winner_bid_escrow.max_locked_amount,
            AuctionError::InsufficientEscrow
        );

        // --- Transactions ---
        // 1. Calculate and Refund Excess to Winner
        let refund = ctx.accounts.winner_bid_escrow.max_locked_amount - winning_amount;
        
        if refund > 0 {
             **ctx.accounts.winner_bid_escrow.to_account_info().try_borrow_mut_lamports()? -= refund;
             **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += refund;
        }

        // 2. Pay Seller
        **ctx.accounts.winner_bid_escrow.to_account_info().try_borrow_mut_lamports()? -= winning_amount;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += winning_amount;

        // NFT → winner
        token::transfer(
            ctx.accounts.into_transfer_to_winner(),
            1,
        )?;
        
        // Mark settled
        auction.settled = true;

        Ok(())
    } 

    pub fn refund_loser(ctx: Context<RefundLoser>) -> Result<()> {
        let escrow = &mut ctx.accounts.bid_escrow;
        let auction = &ctx.accounts.auction;

        require!(!escrow.withdrawn, AuctionError::AlreadyWithdrawn);
        require!(auction.settled, AuctionError::AuctionNotSettled);

        escrow.withdrawn = true;
        
        // Account is closed automatically, sending all funds to bidder.
        Ok(())
    }


    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let now = Clock::get()?.unix_timestamp;

        // Safety checks
        require!(auction.bid_count == 0, AuctionError::BidsAlreadyPlaced);
        require!(!auction.settled, AuctionError::AlreadySettled);
        require!(now < auction.end_time, AuctionError::AuctionEnded);

        // Transfer NFT back to seller
        let seeds = &[
            b"auction".as_ref(),
            auction.nft_mint.as_ref(),
            &[auction.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            ctx.accounts.into_transfer_back_to_seller().with_signer(signer),
            1,
        )?;

        Ok(())
    }

    

}



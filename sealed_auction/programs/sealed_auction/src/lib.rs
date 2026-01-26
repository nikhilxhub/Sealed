use anchor_lang::prelude::*;
use anchor_spl::token::{self};
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
        _winner: Pubkey,
        winning_amount: u64,
        _proof: ArciumProof,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(now > ctx.accounts.auction.end_time, AuctionError::AuctionNotEnded);
        require!(!ctx.accounts.auction.settled, AuctionError::AlreadySettled);

        // --- Verify Arcium Attestation ---
        // TODO: Implement proper hash and ed25519 verification. 
        
        // --- Financial Safety ---
        require!(winning_amount >= ctx.accounts.auction.min_price, AuctionError::BelowMinPrice);
        require!(
            winning_amount <= ctx.accounts.winner_bid_escrow.max_locked_amount,
            AuctionError::InsufficientEscrow
        );

        // --- Transactions ---
        // 1. Pay Seller
        // Uses system_program::transfer with PDA signer
        let auction_key = ctx.accounts.auction.key();
        let winner_key = ctx.accounts.winner.key();
        
        let seeds = &[
            b"bid_escrow",
            auction_key.as_ref(),
            winner_key.as_ref(),
            &[ctx.accounts.winner_bid_escrow.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.winner_bid_escrow.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
                signer_seeds,
            ),
            winning_amount,
        )?;

        // 2. Refund Excess to Winner
        // Handled automatically by Anchor's `close = winner` constraint.
        // Any remaining lamports in winner_bid_escrow (max_locked - winning_amount) 
        // will be sent to the winner when the account closes at end of instruction.

        // NFT → winner
        token::transfer(
            ctx.accounts.into_transfer_to_winner(),
            1,
        )?;
        
        // Mark settled
        ctx.accounts.winner_bid_escrow.withdrawn = true;
        ctx.accounts.auction.settled = true;

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

    /// Finalize auction when Arcium determines no valid winner exists
    /// (all bids < min_price or no bids). Permissionless - anyone can crank.
    pub fn finalize_no_winner(
        ctx: Context<FinalizeNoWinner>,
        _proof: ArciumProof,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(now > ctx.accounts.auction.end_time, AuctionError::AuctionNotEnded);
        require!(!ctx.accounts.auction.settled, AuctionError::AlreadySettled);

        // --- Verify Arcium Attestation ---
        // Arcium must attest that no valid winner exists
        // TODO: Implement proper hash and ed25519 verification

        // Transfer NFT back to seller
        let seeds = &[
            b"auction".as_ref(),
            ctx.accounts.auction.nft_mint.as_ref(),
            &[ctx.accounts.auction.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            ctx.accounts.into_transfer_back_to_seller().with_signer(signer),
            1,
        )?;

        // Mark as settled so bidders can call refund_loser
        ctx.accounts.auction.settled = true;

        Ok(())
    }

    

}



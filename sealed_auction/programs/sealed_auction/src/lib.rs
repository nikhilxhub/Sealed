use anchor_lang::prelude::*;
use anchor_spl::token::{self};
use anchor_lang::system_program;

mod state;
mod errors;
mod instructions;

use state::*;
use errors::*;
use instructions::*;


declare_id!("2rTWXsHTnJdSKxJjdG1wDWdQYFFD3b6RfHbqi3VsR2dt");

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

    /// Settle the auction using the verified result from arcium_program
    /// The auction_result account is created by arcium_program after reveal_winner
    /// and contains the plaintext winner/winning_amount verified by MPC
    pub fn settle_auction(ctx: Context<SettleAuction>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(now > ctx.accounts.auction.end_time, AuctionError::AuctionNotEnded);
        require!(!ctx.accounts.auction.settled, AuctionError::AlreadySettled);

        // --- Verify Cross-Program Account ---
        let auction_result = &ctx.accounts.auction_result;

        // 1. Verify the account is owned by arcium_program (enforced by seeds::program constraint)
        require!(
            auction_result.to_account_info().owner == &ARCIUM_PROGRAM_ID,
            AuctionError::InvalidAuctionResult
        );

        // 2. Verify the result has been revealed
        require!(auction_result.revealed, AuctionError::ResultNotRevealed);

        // 3. Verify the auction ID matches
        require!(
            auction_result.auction_id == ctx.accounts.auction.key(),
            AuctionError::AuctionMismatch
        );

        // Read verified winner/amount from arcium_program's AuctionResult
        let winner = auction_result.winner;
        let winning_amount = auction_result.winning_amount;

        // 4. Verify winner matches the provided winner account
        require!(
            winner == ctx.accounts.winner.key(),
            AuctionError::AuctionMismatch
        );

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
    /// The auction_result account must show winner = Pubkey::default() (all zeros)
    pub fn finalize_no_winner(ctx: Context<FinalizeNoWinner>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(now > ctx.accounts.auction.end_time, AuctionError::AuctionNotEnded);
        require!(!ctx.accounts.auction.settled, AuctionError::AlreadySettled);

        // --- Verify Cross-Program Account ---
        let auction_result = &ctx.accounts.auction_result;

        // 1. Verify the account is owned by arcium_program (enforced by seeds::program constraint)
        require!(
            auction_result.to_account_info().owner == &ARCIUM_PROGRAM_ID,
            AuctionError::InvalidAuctionResult
        );

        // 2. Verify the result has been revealed
        require!(auction_result.revealed, AuctionError::ResultNotRevealed);

        // 3. Verify the auction ID matches
        require!(
            auction_result.auction_id == ctx.accounts.auction.key(),
            AuctionError::AuctionMismatch
        );

        // 4. Verify no valid winner (winner is Pubkey::default() and amount is 0)
        require!(
            auction_result.winner == Pubkey::default() && auction_result.winning_amount == 0,
            AuctionError::NoValidWinner
        );

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

    /// Reclaim NFT when auction ends with ZERO bids.
    /// This is needed because:
    /// - cancel_auction requires auction NOT ended
    /// - finalize_no_winner requires AuctionResult (which requires bids to exist)
    /// Only the seller can call this.
    pub fn reclaim_unsold(ctx: Context<ReclaimUnsold>) -> Result<()> {
        let auction = &ctx.accounts.auction;
        let now = Clock::get()?.unix_timestamp;

        // Safety checks
        require!(now > auction.end_time, AuctionError::AuctionNotEnded);
        require!(auction.bid_count == 0, AuctionError::BidsAlreadyPlaced);
        require!(!auction.settled, AuctionError::AlreadySettled);

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

        // Account is closed by Anchor's `close = seller` constraint
        // Rent is returned to seller

        Ok(())
    }

    /// Close a settled auction account to reclaim rent.
    /// Use this to clean up old settled auctions that weren't closed properly.
    pub fn close_settled(_ctx: Context<CloseSettled>) -> Result<()> {
        // Account is closed automatically by the `close = seller` constraint
        Ok(())
    }

}

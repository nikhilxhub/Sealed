use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CallbackAccount, CircuitSource, OffChainCircuitSource};
use arcium_macros::circuit_hash;

const COMP_DEF_OFFSET_SUBMIT_BID: u32 = comp_def_offset("submit_bid");
const COMP_DEF_OFFSET_REVEAL_WINNER: u32 = comp_def_offset("reveal_winner");

// Circuit URLs - points to compiled .arcis files in the repo
const SUBMIT_BID_CIRCUIT_URL: &str = "https://raw.githubusercontent.com/nikhilxhub/Sealed/main/arcium_program/build/submit_bid.arcis";
const REVEAL_WINNER_CIRCUIT_URL: &str = "https://raw.githubusercontent.com/nikhilxhub/Sealed/main/arcium_program/build/reveal_winner.arcis";

// Seeds for PDAs
const AUCTION_STATE_SEED: &[u8] = b"auction_bid_state";
const AUCTION_RESULT_SEED: &[u8] = b"auction_result";

declare_id!("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");

/// Helper: Reconstruct a Pubkey from 4 u64 chunks (little-endian)
fn reconstruct_pubkey(chunk0: u64, chunk1: u64, chunk2: u64, chunk3: u64) -> Pubkey {
    let mut bytes = [0u8; 32];
    bytes[0..8].copy_from_slice(&chunk0.to_le_bytes());
    bytes[8..16].copy_from_slice(&chunk1.to_le_bytes());
    bytes[16..24].copy_from_slice(&chunk2.to_le_bytes());
    bytes[24..32].copy_from_slice(&chunk3.to_le_bytes());
    Pubkey::new_from_array(bytes)
}

#[arcium_program]
pub mod arcium_program {
    use super::*;

    /// Initialize computation definition for submit_bid circuit
    pub fn init_submit_bid_comp_def(ctx: Context<InitSubmitBidCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: SUBMIT_BID_CIRCUIT_URL.to_string(),
                hash: circuit_hash!("submit_bid"),
            })),
            None
        )?;
        Ok(())
    }

    /// Initialize computation definition for reveal_winner circuit
    pub fn init_reveal_winner_comp_def(ctx: Context<InitRevealWinnerCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: REVEAL_WINNER_CIRCUIT_URL.to_string(),
                hash: circuit_hash!("reveal_winner"),
            })),
            None
        )?;
        Ok(())
    }

    /// Initialize auction bid state account for a specific auction
    /// This must be called once before any bids are submitted for an auction
    pub fn initialize_auction_state(
        ctx: Context<InitializeAuctionState>,
        _auction_id: Pubkey,
    ) -> Result<()> {
        let state = &mut ctx.accounts.auction_bid_state;
        state.auction_id = _auction_id;
        state.bump = ctx.bumps.auction_bid_state;
        state.bid_count = 0;
        state.encrypted_max_bid = [0u8; 32];
        state.encrypted_winner_0 = [0u8; 32];
        state.encrypted_winner_1 = [0u8; 32];
        state.encrypted_winner_2 = [0u8; 32];
        state.encrypted_winner_3 = [0u8; 32];
        state.nonce = 0;
        Ok(())
    }

    /// Submit a bid with encrypted values
    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        computation_offset: u64,
        encryption_pubkey: [u8; 32],
        nonce: u128,
        current_max_bid: [u8; 32],
        current_winner_0: [u8; 32],
        current_winner_1: [u8; 32],
        current_winner_2: [u8; 32],
        current_winner_3: [u8; 32],
        new_bid_amount: [u8; 32],
        new_bidder_0: [u8; 32],
        new_bidder_1: [u8; 32],
        new_bidder_2: [u8; 32],
        new_bidder_3: [u8; 32],
        min_price: [u8; 32],
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            .x25519_pubkey(encryption_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(current_max_bid)
            .encrypted_u64(current_winner_0)
            .encrypted_u64(current_winner_1)
            .encrypted_u64(current_winner_2)
            .encrypted_u64(current_winner_3)
            .encrypted_u64(new_bid_amount)
            .encrypted_u64(new_bidder_0)
            .encrypted_u64(new_bidder_1)
            .encrypted_u64(new_bidder_2)
            .encrypted_u64(new_bidder_3)
            .encrypted_u64(min_price)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![SubmitBidCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.auction_bid_state.key(),
                        is_writable: true,
                    },
                ]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    /// Callback from MPC computation - updates auction state with new encrypted values
    #[arcium_callback(encrypted_ix = "submit_bid")]
    pub fn submit_bid_callback(
        ctx: Context<SubmitBidCallback>,
        output: SignedComputationOutputs<SubmitBidOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(SubmitBidOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let state = &mut ctx.accounts.auction_bid_state;
        state.encrypted_max_bid = o.ciphertexts[0];
        state.encrypted_winner_0 = o.ciphertexts[1];
        state.encrypted_winner_1 = o.ciphertexts[2];
        state.encrypted_winner_2 = o.ciphertexts[3];
        state.encrypted_winner_3 = o.ciphertexts[4];
        state.nonce = o.nonce;
        state.bid_count += 1;

        emit!(AuctionUpdatedEvent {
            auction_id: state.auction_id,
            new_max_bid: o.ciphertexts[0],
            new_winner_0: o.ciphertexts[1],
            new_winner_1: o.ciphertexts[2],
            new_winner_2: o.ciphertexts[3],
            new_winner_3: o.ciphertexts[4],
            nonce: o.nonce,
            bid_count: state.bid_count,
        });
        Ok(())
    }

    /// Reveal the winner - decrypts the final auction state
    /// Call this after auction ends to get plaintext winner info and enable settlement
    pub fn reveal_winner(
        ctx: Context<RevealWinner>,
        computation_offset: u64,
        encryption_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Initialize auction_result account
        let result = &mut ctx.accounts.auction_result;
        result.auction_id = ctx.accounts.auction_bid_state.auction_id;
        result.bump = ctx.bumps.auction_result;
        result.revealed = false;
        result.winner = Pubkey::default();
        result.winning_amount = 0;
        result.revealed_at = 0;

        let state = &ctx.accounts.auction_bid_state;

        let args = ArgBuilder::new()
            .x25519_pubkey(encryption_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(state.encrypted_max_bid)
            .encrypted_u64(state.encrypted_winner_0)
            .encrypted_u64(state.encrypted_winner_1)
            .encrypted_u64(state.encrypted_winner_2)
            .encrypted_u64(state.encrypted_winner_3)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![RevealWinnerCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.auction_bid_state.key(),
                        is_writable: false,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.auction_result.key(),
                        is_writable: true,
                    },
                ]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    /// Callback from reveal computation - stores plaintext winner info for settlement
    #[arcium_callback(encrypted_ix = "reveal_winner")]
    pub fn reveal_winner_callback(
        ctx: Context<RevealWinnerCallback>,
        output: SignedComputationOutputs<RevealWinnerOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(RevealWinnerOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Reconstruct winner pubkey from u64 chunks
        let winner = reconstruct_pubkey(o.field_1, o.field_2, o.field_3, o.field_4);

        // Store plaintext result for settlement
        let result = &mut ctx.accounts.auction_result;
        result.winner = winner;
        result.winning_amount = o.field_0;
        result.revealed_at = Clock::get()?.unix_timestamp;
        result.revealed = true;

        // Emit event for indexers
        emit!(AuctionResultEvent {
            auction_id: ctx.accounts.auction_bid_state.auction_id,
            winning_bid: o.field_0,
            winner,
        });

        Ok(())
    }
}

// ============================================================================
// Account Structs
// ============================================================================

/// Stores encrypted auction state between bids
#[account]
#[derive(InitSpace)]
pub struct AuctionBidState {
    pub auction_id: Pubkey,
    pub bump: u8,
    pub bid_count: u64,
    pub encrypted_max_bid: [u8; 32],
    pub encrypted_winner_0: [u8; 32],
    pub encrypted_winner_1: [u8; 32],
    pub encrypted_winner_2: [u8; 32],
    pub encrypted_winner_3: [u8; 32],
    pub nonce: u128,
}

/// Stores the PLAINTEXT auction result after reveal
/// This is what sealed_auction reads to verify the winner
#[account]
#[derive(InitSpace)]
pub struct AuctionResult {
    /// The auction this result belongs to
    pub auction_id: Pubkey,
    /// PDA bump
    pub bump: u8,
    /// Whether the result has been revealed
    pub revealed: bool,
    /// The winner's pubkey (plaintext)
    pub winner: Pubkey,
    /// The winning bid amount in lamports (plaintext)
    pub winning_amount: u64,
    /// Timestamp when revealed
    pub revealed_at: i64,
}

// ============================================================================
// Instruction Account Structs
// ============================================================================

#[derive(Accounts)]
#[instruction(auction_id: Pubkey)]
pub struct InitializeAuctionState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + AuctionBidState::INIT_SPACE,
        seeds = [AUCTION_STATE_SEED, auction_id.as_ref()],
        bump,
    )]
    pub auction_bid_state: Account<'info, AuctionBidState>,

    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("submit_bid", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitBid<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_BID))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    #[account(mut)]
    pub auction_bid_state: Account<'info, AuctionBidState>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("submit_bid")]
#[derive(Accounts)]
pub struct SubmitBidCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_BID))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,

    #[account(mut)]
    pub auction_bid_state: Account<'info, AuctionBidState>,
}

#[queue_computation_accounts("reveal_winner", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RevealWinner<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_WINNER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    /// The auction's encrypted state account
    pub auction_bid_state: Account<'info, AuctionBidState>,

    /// The auction result account (created here, written in callback)
    #[account(
        init,
        payer = payer,
        space = 8 + AuctionResult::INIT_SPACE,
        seeds = [AUCTION_RESULT_SEED, auction_bid_state.auction_id.as_ref()],
        bump,
    )]
    pub auction_result: Account<'info, AuctionResult>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("reveal_winner")]
#[derive(Accounts)]
pub struct RevealWinnerCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_WINNER))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,

    /// The auction bid state (read-only)
    pub auction_bid_state: Account<'info, AuctionBidState>,

    /// The auction result account (writable - stores plaintext result)
    #[account(mut)]
    pub auction_result: Account<'info, AuctionResult>,
}

#[init_computation_definition_accounts("submit_bid", payer)]
#[derive(Accounts)]
pub struct InitSubmitBidCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("reveal_winner", payer)]
#[derive(Accounts)]
pub struct InitRevealWinnerCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct AuctionUpdatedEvent {
    pub auction_id: Pubkey,
    pub new_max_bid: [u8; 32],
    pub new_winner_0: [u8; 32],
    pub new_winner_1: [u8; 32],
    pub new_winner_2: [u8; 32],
    pub new_winner_3: [u8; 32],
    pub nonce: u128,
    pub bid_count: u64,
}

#[event]
pub struct AuctionResultEvent {
    pub auction_id: Pubkey,
    pub winning_bid: u64,
    pub winner: Pubkey,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
}

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

declare_id!("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");

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
        // Initialize with zeros - first bid will set the initial values
        state.encrypted_max_bid = [0u8; 32];
        state.encrypted_winner_0 = [0u8; 32];
        state.encrypted_winner_1 = [0u8; 32];
        state.encrypted_winner_2 = [0u8; 32];
        state.encrypted_winner_3 = [0u8; 32];
        state.nonce = 0;
        Ok(())
    }

    /// Submit a bid with encrypted values
    ///
    /// For the FIRST bid: current state values should be encrypted zeros
    /// For subsequent bids: frontend reads current state from auction_bid_state account
    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        computation_offset: u64,
        // Client's ephemeral X25519 public key (32 bytes)
        encryption_pubkey: [u8; 32],
        // Encryption nonce (u128)
        nonce: u128,
        // Encrypted BidInputs fields (order must match circuit struct)
        // For first bid: these should be encrypted zeros
        // For subsequent bids: read from auction_bid_state account
        current_max_bid: [u8; 32],
        current_winner_0: [u8; 32],
        current_winner_1: [u8; 32],
        current_winner_2: [u8; 32],
        current_winner_3: [u8; 32],
        // New bid data (always from the current bidder)
        new_bid_amount: [u8; 32],
        new_bidder_0: [u8; 32],
        new_bidder_1: [u8; 32],
        new_bidder_2: [u8; 32],
        new_bidder_3: [u8; 32],
        min_price: [u8; 32],
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // ArgBuilder for Enc<Shared, BidInputs>:
        // 1. x25519 pubkey for Shared type owner
        // 2. plaintext nonce for decryption
        // 3. encrypted fields in BidInputs struct order
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

        // Include auction_bid_state in callback so we can update it
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

        // Update the auction state with new encrypted values
        let state = &mut ctx.accounts.auction_bid_state;
        state.encrypted_max_bid = o.ciphertexts[0];
        state.encrypted_winner_0 = o.ciphertexts[1];
        state.encrypted_winner_1 = o.ciphertexts[2];
        state.encrypted_winner_2 = o.ciphertexts[3];
        state.encrypted_winner_3 = o.ciphertexts[4];
        state.nonce = o.nonce;
        state.bid_count += 1;

        // Emit event for indexers/frontends
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
    /// Call this after auction ends to get plaintext winner info
    pub fn reveal_winner(
        ctx: Context<RevealWinner>,
        computation_offset: u64,
        encryption_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Read encrypted state from auction_bid_state account
        let state = &ctx.accounts.auction_bid_state;

        // ArgBuilder for Enc<Shared, AuctionState>
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
                ]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    /// Callback from reveal computation - emits plaintext winner info
    #[arcium_callback(encrypted_ix = "reveal_winner")]
    pub fn reveal_winner_callback(
        ctx: Context<RevealWinnerCallback>,
        output: SignedComputationOutputs<RevealWinnerOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(RevealWinnerOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Emit plaintext winner info
        emit!(AuctionResultEvent {
            auction_id: ctx.accounts.auction_bid_state.auction_id,
            winning_bid: o.field_0,
            winner_0: o.field_1,
            winner_1: o.field_2,
            winner_2: o.field_3,
            winner_3: o.field_4,
        });
        Ok(())
    }
}

// ============================================================================
// Account Structs
// ============================================================================

/// Stores encrypted auction state between bids
/// One account per auction, derived from auction_id
#[account]
#[derive(InitSpace)]
pub struct AuctionBidState {
    /// The auction this state belongs to (from sealed_auction program)
    pub auction_id: Pubkey,
    /// PDA bump
    pub bump: u8,
    /// Number of bids processed
    pub bid_count: u64,
    /// Encrypted current max bid
    pub encrypted_max_bid: [u8; 32],
    /// Encrypted winner pubkey chunks (4 x u64)
    pub encrypted_winner_0: [u8; 32],
    pub encrypted_winner_1: [u8; 32],
    pub encrypted_winner_2: [u8; 32],
    pub encrypted_winner_3: [u8; 32],
    /// Nonce for the current encrypted state
    pub nonce: u128,
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
    /// CHECK: mempool_account, checked by arcium program
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by arcium program
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by arcium program
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_BID))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    /// The auction's encrypted state account
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

    /// CHECK: computation_account, checked by arcium program
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,

    /// The auction state to update (from CallbackAccount)
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
    /// CHECK: mempool_account, checked by arcium program
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by arcium program
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by arcium program
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

    /// CHECK: computation_account, checked by arcium program
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,

    /// The auction state (read-only in callback)
    pub auction_bid_state: Account<'info, AuctionBidState>,
}

#[init_computation_definition_accounts("submit_bid", payer)]
#[derive(Accounts)]
pub struct InitSubmitBidCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
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
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct AuctionUpdatedEvent {
    /// The auction this update belongs to
    pub auction_id: Pubkey,
    /// Encrypted max bid
    pub new_max_bid: [u8; 32],
    /// Encrypted winner pubkey chunks
    pub new_winner_0: [u8; 32],
    pub new_winner_1: [u8; 32],
    pub new_winner_2: [u8; 32],
    pub new_winner_3: [u8; 32],
    /// Encryption nonce
    pub nonce: u128,
    /// Total bids processed for this auction
    pub bid_count: u64,
}

#[event]
pub struct AuctionResultEvent {
    /// The auction this result belongs to
    pub auction_id: Pubkey,
    /// Revealed winning bid amount (in lamports)
    pub winning_bid: u64,
    /// Revealed winner pubkey chunks (reassemble: winner_0 | winner_1 | winner_2 | winner_3)
    pub winner_0: u64,
    pub winner_1: u64,
    pub winner_2: u64,
    pub winner_3: u64,
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

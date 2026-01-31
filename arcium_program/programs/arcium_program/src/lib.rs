use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CallbackAccount, CircuitSource, OffChainCircuitSource};
use arcium_macros::circuit_hash;

const COMP_DEF_OFFSET_SUBMIT_BID: u32 = comp_def_offset("submit_bid");

// Circuit URLs - points to compiled .arcis files in the repo
// After running `arcium build`, upload the build/*.arcis files to GitHub and update these URLs
const SUBMIT_BID_CIRCUIT_URL: &str = "https://raw.githubusercontent.com/nikhilxhub/Sealed/main/arcium_program/build/submit_bid.arcis";
const REVEAL_WINNER_CIRCUIT_URL: &str = "https://raw.githubusercontent.com/nikhilxhub/Sealed/main/arcium_program/build/reveal_winner.arcis";

declare_id!("2excUVgCNGZDN4yHGBbxBg4ptNYTH1nyqnJ5HArAG6wC");

#[arcium_program]
pub mod arcium_program {
    use super::*;

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

    /// Submit a bid with encrypted values
    ///
    /// The circuit expects Enc<Shared, BidInputs> which requires:
    /// 1. x25519 public key (for shared secret derivation)
    /// 2. nonce (for decryption)
    /// 3. All encrypted fields matching BidInputs struct order
    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        computation_offset: u64,
        // Client's ephemeral X25519 public key (32 bytes)
        encryption_pubkey: [u8; 32],
        // Encryption nonce (u128)
        nonce: u128,
        // Encrypted BidInputs fields (order must match struct)
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

        // ArgBuilder for Enc<Shared, BidInputs>:
        // 1. x25519 pubkey for Shared type
        // 2. plaintext nonce for decryption
        // 3. encrypted fields in BidInputs order
        let args = ArgBuilder::new()
            // Shared type requires pubkey + nonce
            .x25519_pubkey(encryption_pubkey)
            .plaintext_u128(nonce)
            // BidInputs fields in order
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
                &[]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "submit_bid")]
    pub fn submit_bid_callback(
        ctx: Context<SubmitBidCallback>,
        output: SignedComputationOutputs<SubmitBidOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(SubmitBidOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Emit the NEW encrypted state
        emit!(AuctionUpdatedEvent {
            new_max_bid: o.ciphertexts[0],
            new_winner_id: o.ciphertexts[1],
        });
        Ok(())
    }

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

    /// Reveal the winner - decrypts the final auction state
    ///
    /// The circuit expects Enc<Shared, AuctionState> and returns plaintext AuctionState
    pub fn reveal_winner(
        ctx: Context<RevealWinner>,
        computation_offset: u64,
        // Client's ephemeral X25519 public key
        encryption_pubkey: [u8; 32],
        // Encryption nonce
        nonce: u128,
        // Encrypted AuctionState fields
        max_bid: [u8; 32],
        winner_0: [u8; 32],
        winner_1: [u8; 32],
        winner_2: [u8; 32],
        winner_3: [u8; 32],
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // ArgBuilder for Enc<Shared, AuctionState>
        let args = ArgBuilder::new()
            .x25519_pubkey(encryption_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(max_bid)
            .encrypted_u64(winner_0)
            .encrypted_u64(winner_1)
            .encrypted_u64(winner_2)
            .encrypted_u64(winner_3)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![RevealWinnerCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "reveal_winner")]
    pub fn reveal_winner_callback(
        ctx: Context<RevealWinnerCallback>,
        output: SignedComputationOutputs<RevealWinnerOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(RevealWinnerOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Output struct: AuctionState { max_bid, winner_0, winner_1, winner_2, winner_3 }
        // Flattened:
        // field_0 = max_bid
        // field_1 = winner_0
        // field_2 = winner_1
        // field_3 = winner_2
        // field_4 = winner_3
        emit!(AuctionResultEvent {
            winning_bid: o.field_0,
            winner_0: o.field_1,
            winner_1: o.field_2,
            winner_2: o.field_3,
            winner_3: o.field_4,
        });
        Ok(())
    }
}

const COMP_DEF_OFFSET_REVEAL_WINNER: u32 = comp_def_offset("reveal_winner");

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
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_BID)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
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
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_WINNER)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("submit_bid")]
#[derive(Accounts)]
pub struct SubmitBidCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_BID)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("reveal_winner")]
#[derive(Accounts)]
pub struct RevealWinnerCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_REVEAL_WINNER)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("submit_bid", payer)]
#[derive(Accounts)]
pub struct InitSubmitBidCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("reveal_winner", payer)]
#[derive(Accounts)]
pub struct InitRevealWinnerCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct AuctionUpdatedEvent {
    pub new_max_bid: [u8; 32],
    pub new_winner_id: [u8; 32],
}

#[event]
pub struct AuctionResultEvent {
    pub winning_bid: u64,
    pub winner_0: u64,
    pub winner_1: u64,
    pub winner_2: u64,
    pub winner_3: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
}

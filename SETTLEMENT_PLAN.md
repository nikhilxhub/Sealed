# Settlement Flow Implementation Plan (IMPLEMENTED)

## Current Gap

The `sealed_auction::settle_auction` expects an Ed25519 signature from `ARCIUM_VERIFIER`, but Arcium MPC produces computation outputs, not signatures.

## Solution: Cross-Program Verification via On-Chain Result Account

Instead of Ed25519 signatures, we store the decrypted result on-chain and verify account ownership.

---

## Architecture Changes

### 1. Add `AuctionResult` Account to `arcium_program`

```rust
#[account]
pub struct AuctionResult {
    pub auction_id: Pubkey,        // The sealed_auction auction
    pub winner: Pubkey,            // Decrypted winner pubkey
    pub winning_amount: u64,       // Decrypted winning bid (lamports)
    pub revealed_at: i64,          // Timestamp
    pub bump: u8,
}
```

**PDA:** `["auction_result", auction_id]`

### 2. Modify `reveal_winner_callback` in `arcium_program`

After MPC decryption, write the result to `AuctionResult` account:

```rust
#[arcium_callback(encrypted_ix = "reveal_winner")]
pub fn reveal_winner_callback(ctx: Context<RevealWinnerCallback>, output: ...) -> Result<()> {
    // 1. Verify computation output
    let o = output.verify_output(...)?;

    // 2. Reconstruct winner pubkey from u64 chunks
    let winner = reconstruct_pubkey(o.winner_0, o.winner_1, o.winner_2, o.winner_3);

    // 3. Write to AuctionResult account
    let result = &mut ctx.accounts.auction_result;
    result.auction_id = ctx.accounts.auction_bid_state.auction_id;
    result.winner = winner;
    result.winning_amount = o.winning_bid;
    result.revealed_at = Clock::get()?.unix_timestamp;

    // 4. Emit event (still useful for indexers)
    emit!(AuctionResultEvent { ... });

    Ok(())
}
```

### 3. Modify `settle_auction` in `sealed_auction`

Replace Ed25519 verification with cross-program account verification:

```rust
pub fn settle_auction(
    ctx: Context<SettleAuction>,
    // Remove: winner, winning_amount, proof
) -> Result<()> {
    // 1. Read from AuctionResult account (owned by arcium_program)
    let result = &ctx.accounts.auction_result;

    // 2. Verify account ownership (trust model)
    require!(
        result.to_account_info().owner == &ARCIUM_PROGRAM_ID,
        AuctionError::InvalidProof
    );

    // 3. Verify auction matches
    require!(
        result.auction_id == ctx.accounts.auction.key(),
        AuctionError::AuctionMismatch
    );

    // 4. Use result.winner and result.winning_amount for settlement
    let winner = result.winner;
    let winning_amount = result.winning_amount;

    // ... rest of settlement logic
}
```

---

## Frontend Settlement Flow

```typescript
// 1. Check if auction ended
const now = Date.now() / 1000;
if (now > auctionData.endTime) {

  // 2. Call reveal_winner on arcium_program
  const arciumService = new ArciumService(connection, wallet);
  await arciumService.revealWinner(auctionId);

  // 3. Wait for callback to finalize
  await arciumService.awaitComputation(computationOffset);

  // 4. Call settle_auction on sealed_auction
  // Now it reads from AuctionResult account automatically
  await sealedAuctionProgram.methods
    .settleAuction()
    .accounts({
      auction: auctionId,
      auctionResult: arciumService.getAuctionResultPDA(auctionId),
      // ... other accounts
    })
    .rpc();
}
```

---

## Implementation Steps

### Step 1: Update `arcium_program`
- [ ] Add `AuctionResult` account struct
- [ ] Add `InitializeAuctionResult` instruction (or use init_if_needed)
- [ ] Update `reveal_winner` to include `auction_result` account
- [ ] Update `reveal_winner_callback` to write plaintext result

### Step 2: Update `sealed_auction`
- [ ] Remove Ed25519 verification from `settle_auction`
- [ ] Add `auction_result: Account<'info, AuctionResult>` to `SettleAuction` context
- [ ] Add cross-program account verification
- [ ] Update `finalize_no_winner` similarly

### Step 3: Update Frontend
- [ ] Add `revealWinner()` method to `ArciumService`
- [ ] Add `handleSettle()` implementation in page.tsx
- [ ] Add UI for settlement button when auction ends

---

## Trust Model

**Before (Ed25519):**
- Trust: Whoever holds ARCIUM_VERIFIER private key

**After (Account Ownership):**
- Trust: Solana runtime enforces account ownership
- Only `arcium_program` can create/modify `AuctionResult` accounts
- If `AuctionResult` exists and is owned by `arcium_program`, the data is trustworthy

This is actually MORE decentralized since there's no single private key.

---

## Files to Modify

1. `arcium_program/programs/arcium_program/src/lib.rs`
2. `sealed_auction/programs/sealed_auction/src/lib.rs`
3. `sealed_auction/programs/sealed_auction/src/instructions.rs` (if separate)
4. `app/app/utils/arcium.ts`
5. `app/app/auctions/[id]/page.tsx`

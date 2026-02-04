# Sealed Bid Auction Protocol

A privacy-preserving sealed-bid auction protocol on Solana, leveraging **Arcium** for confidential computing. This protocol ensures that bid amounts remain secret until the auction concludes, preventing front-running and bid sniping.

> [!IMPORTANT]
> ### ⚠️ Note for Hackathon Judges
> **Settlement : MPC computation is slow on devnet.**
> Devnet can be slow - please wait 1-2 minutes and try again.
>
> 1. Wait 2-3 minutes total from your first "Settle" click.
> 2. Then try clicking **"Settle Auction"** again.

## 1. Protocol Lifecycle

The protocol operates in three distinct phases:

### Phase 1: Creation (Seller)
- **Action**: A seller initiates an auction for an NFT.
- **On-Chain**: 
  - An `Auction` account is initialized storing parameters (end time, min price).
  - The NFT is transferred from the seller to a program-owned **NFT Escrow**.
- **State**: The auction is live and ready to accept bids.

### Phase 2: Bidding (Bidders)
- **Action**: Users submit encrypted bids.
- **On-Chain**: 
  - Bidders call `lock_bid_funds`.
  - A `BidEscrow` PDA is created for each bidder.
  - The *maximum* amount the user is willing to pay is transferred into this escrow.
- **Off-Chain (Arcium)**:
  - The actual bid value is encrypted and submitted to the Arcium network.
  - *Privacy*: No one on-chain knows the exact bid amount, only that the bidder has locked up "at least X funds".

- **On-Chain**:
  - Anyone calls `settle_auction` which reads from the **AuctionResult** account.
  - **Verification**: The program verifies the `AuctionResult` account is owned by the Arcium program and matches the auction ID.
  - **Distribution**:
    1. Winning amount is transferred from Winner's Escrow to Seller.
    2. Any excess funds (diff between locked total and winning bid) are refunded to the Winner.
    3. The NFT is transferred to the Winner.
    4. The Auction is marked as `settled`.

### Phase 4: Refunds (Losers)
- **Action**: Losing bidders reclaim their funds.
- **On-Chain**:
  - Once the auction is `settled`, losers call `refund_loser`.
  - Their `BidEscrow` account is closed.
  - All locked SOL (including rent) is returned to their wallet.

## 2. Key Instructions

### `create_auction`
Initializes the auction state and escrows the seller's NFT.
- **Constraints**: `end_time` must be in the future.

### `lock_bid_funds`
Locks SOL in a PDA to ensure the bidder can pay if they win.
- **Note**: This does *not* reveal the specific bid amount, only the collateral.

### `settle_auction`
Finalizes the auction using the verified `AuctionResult` data from Arcium.
- **Verification**: Verifies that the `AuctionResult` account is owned by the `arcium_program` PDA.

### `finalize_no_winner`
Handles the case where Arcium determines no bids were above the minimum price.

### `reclaim_unsold` / `cancel_auction`
Mechanisms for reclaiming NFTs when an auction ends with zero bids or is cancelled before ending.

### `close_settled`
Allows reclaiming rent from old settled auction accounts.

## 3. Technology Stack
- **Solana (Anchor)**: Consensus and settlement layer.
- **Arcium**: Confidential computing layer for encrypted bid processing.

---

## 🚀 What's Next?
Check out our [Future Roadmap](FUTURE_PLANS.md) to see how we are evolving Sealed into a privacy-first liquidity layer for digital assets.

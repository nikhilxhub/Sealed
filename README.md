# Sealed Bid Auction Protocol

A privacy-preserving sealed-bid auction protocol on Solana, leveraging **Arcium** for confidential computing. This protocol ensures that bid amounts remain secret until the auction concludes, preventing front-running and bid sniping.

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

### Phase 3: Settlement (Arcium & Any User)
- **Action**: Auction time ends. Arcium computes the result.
- **Off-Chain (Arcium)**:
  - Arcium nodes decrypt valid bids.
  - The highest bidder is determined.
  - A cryptographic proof (Signature) is generated certifying the winner and the winning amount.
- **On-Chain**:
  - Anyone calls `settle_auction` with the Arcium proof.
  - **Verification**: The program verifies the proof against Arcium's public key.
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
Trustlessly finalizes the auction using Arcium's proof.
- **Crypto check**: Verifies `Hash(Winner + Amount)` matches the signed message from Arcium.
- **Safety**: Ensures the winner actually pays >= min_price and has enough funds locked.

### `refund_loser` / `cancel_auction`
Mechanisms for reclaiming funds/NFTs under specific conditions (lost auction or no bids placed).

## 3. Technology Stack
- **Solana (Anchor)**: Consensus and settlement layer.
- **Arcium**: Confidential computing layer for encrypted bid processing.

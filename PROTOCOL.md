
---

# 🧠 What are we building? (One-line)

> A **sealed-bid NFT auction** where
> **bids stay private**,
> **funds are locked on-chain**,
> and **the winner is revealed only at the end**,
> using **Arcium** for private computation and **Solana** for trustless settlement.

---

# 🧩 Who does what? (Very important)

| Component              | Responsibility                                     |
| ---------------------- | -------------------------------------------------- |
| **Frontend**           | Encrypts bids, talks to Arcium, sends transactions |
| **Arcium (off-chain)** | Privately computes winner, signs result            |
| **Anchor (on-chain)**  | Holds NFT & SOL, enforces rules, moves assets      |

Think of it like:

> **Frontend = messenger**
> **Arcium = private judge**
> **Anchor = vault + referee**

---

# 🏁 Phase 1: Auction Creation

### What the seller does

1. Seller creates an auction with:

   * minimum price
   * end time
2. Seller’s NFT is **moved into an escrow PDA**

### What this guarantees

* Seller **cannot sell or move** the NFT elsewhere
* Only one auction per NFT
* Seller cannot rug bidders

👉 At this point, the auction is live.

---

# 🏁 Phase 2: Bidding (Sealed & Private)

### What a bidder does

1. Enters their **real bid amount** in the frontend (example: 73 SOL)
2. Frontend:

   * encrypts the bid
   * sends the encrypted bid **directly to Arcium**
3. Frontend also calls Solana:

   * locks a **maximum amount** of SOL (example: 100 SOL) in escrow

### Key idea (very important)

* **Anchor never sees the bid**
* **Arcium never holds money**
* Bid privacy is preserved

### Why allow bids below minimum price?

* Rejecting bids early would leak information
* Sealed-bid auctions must accept **all bids**
* Validation happens **only at the end**

---

# 🏁 Phase 3: Auction End (Nothing automatic!)

When the end time passes:

* Nothing happens automatically
* NFT and SOL remain locked
* Auction is now *eligible* for resolution

👉 On Solana, **time gates actions**, it never triggers them.

---

# 🧠 Phase 4: Private Winner Computation (Arcium)

Off-chain, Arcium:

1. Takes all encrypted bids it received
2. Matches them to on-chain escrows (to avoid fake bids)
3. Privately computes:

   * highest bid ≥ minimum price
   * OR determines **no valid winner**
4. Stores the result in an on-chain **AuctionResult account** (owned by Arcium program)

### Important update: The "Proof"
Arcium doesn't just produce a signature. It creates a verified **AuctionResult account** on Solana. The `sealed_auction` program reads this account and verifies that it is owned by the Arcium program PDA.

---

# 🏁 Phase 5: On-Chain Finalization (Someone must call)

1. Verifies auction has ended
2. Verifies the **AuctionResult account** is owned by Arcium Program
3. Checks:

   * price ≥ minimum
   * price ≤ escrowed max
4. Atomically:

   * transfers NFT → winner
   * transfers SOL → seller
   * refunds excess SOL → winner
5. Marks auction as settled

All or nothing. No partial states.

---

## Case B: There is NO winner

1. Verifies auction has ended
2. Verifies Arcium’s verified account showing "no winner"
3. Transfers NFT → seller
4. Marks auction as settled

No SOL moves yet.

---

# 🏁 Phase 6: Refunds (Lazy & Permissionless)

After the auction is settled:

* Every **non-winning bidder**
* Can call `refund_loser`
* Gets **100% of their locked SOL back**

This is:

* permissionless
* on-demand
* safe

No admin, no batching, no trust.

---

# 🧠 Edge Cases (All covered)

### 1️⃣ Seller tries to cancel after bids

❌ Not allowed
Cancel only works if **zero bids exist**

---

### 2️⃣ Seller tries to cancel after auction ends

❌ Not allowed
Resolution must go through Arcium

---

✅ Allowed
Arcium declares **no winner** (in the AuctionResult account)
NFT returns to seller via `finalize_no_winner`
Bidders refund themselves

---

### 4️⃣ Auction ends with ZERO bids

✅ Allowed
Seller calls `reclaim_unsold`
NFT returns to seller immediately (no Arcium step needed for 0 bids)

✅ Allowed
Sealed-bid auctions still work

---

### 5️⃣ Winner locked more SOL than needed

✅ Excess refunded automatically

---

### 6️⃣ Someone submits fake settlement

❌ Blocked
Anchor verifies Arcium signature + escrow limits

---

### 7️⃣ No one calls settlement

⚠️ Auction stays locked but **funds are safe**
Anyone can crank settlement later

---

# 🔐 Why this design is safe

* Seller can’t rug
* Bidders can’t cheat
* Arcium can’t steal
* Frontend can be malicious
* Anyone can call settlement

**Anchor enforces reality.**

---

# 🧠 One-sentence summary (remember this)

> **Bids stay private, funds stay locked, results are signed, and settlement is trustless.**

That’s entire protocol.



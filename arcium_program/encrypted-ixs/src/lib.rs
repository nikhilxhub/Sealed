use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct BidInputs {
        current_max: u64,
        
        // Flattened Pubkey (32 bytes = 4 * u64)
        current_winner_0: u64,
        current_winner_1: u64,
        current_winner_2: u64,
        current_winner_3: u64,
        
        new_bid: u64,
        
        // Flattened New Bidder Pubkey
        new_bidder_0: u64,
        new_bidder_1: u64,
        new_bidder_2: u64,
        new_bidder_3: u64,
        
        min_price: u64,
    }

    pub struct AuctionState {
        max_bid: u64,
        winner_0: u64,
        winner_1: u64,
        winner_2: u64,
        winner_3: u64,
    }

    #[instruction]
    pub fn submit_bid(input_ctxt: Enc<Shared, BidInputs>) -> Enc<Shared, AuctionState> {
        let input = input_ctxt.to_arcis();
        
        // 1. Check conditions
        let is_valid_amount = input.new_bid >= input.min_price;
        let is_higher = input.new_bid > input.current_max;
        
        let should_switch = is_valid_amount && is_higher;
        
        // 2. Select new or old values
        // If switching, take NEW values. Else keep OLD.
        let output = if should_switch {
            AuctionState {
                max_bid: input.new_bid,
                winner_0: input.new_bidder_0,
                winner_1: input.new_bidder_1,
                winner_2: input.new_bidder_2,
                winner_3: input.new_bidder_3,
            }
        } else {
            AuctionState {
                max_bid: input.current_max,
                winner_0: input.current_winner_0,
                winner_1: input.current_winner_1,
                winner_2: input.current_winner_2,
                winner_3: input.current_winner_3,
            }
        };
        
        input_ctxt.owner.from_arcis(output)
    }

    #[instruction]
    pub fn reveal_winner(input_ctxt: Enc<Shared, AuctionState>) -> AuctionState {
        let input = input_ctxt.to_arcis();
        input.reveal()
    }
}

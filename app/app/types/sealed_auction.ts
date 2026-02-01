/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sealed_auction.json`.
 */
export type SealedAuction = {
  "address": "2rTWXsHTnJdSKxJjdG1wDWdQYFFD3b6RfHbqi3VsR2dt",
  "metadata": {
    "name": "sealedAuction",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelAuction",
      "discriminator": [
        156,
        43,
        197,
        110,
        218,
        105,
        143,
        182
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.nft_mint",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "nftEscrowAccount",
          "writable": true
        },
        {
          "name": "sellerNftAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "closeSettled",
      "docs": [
        "Close a settled auction account to reclaim rent.",
        "Use this to clean up old settled auctions that weren't closed properly."
      ],
      "discriminator": [
        191,
        195,
        231,
        168,
        68,
        195,
        231,
        121
      ],
      "accounts": [
        {
          "name": "seller",
          "docs": [
            "Only the seller can close their auction"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.nft_mint",
                "account": "auction"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createAuction",
      "discriminator": [
        234,
        6,
        201,
        246,
        47,
        219,
        176,
        107
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "nftMint"
        },
        {
          "name": "sellerNftAccount",
          "writable": true
        },
        {
          "name": "nftEscrowAccount",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "minPrice",
          "type": "u64"
        },
        {
          "name": "endTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "finalizeNoWinner",
      "docs": [
        "Finalize auction when Arcium determines no valid winner exists",
        "(all bids < min_price or no bids). Permissionless - anyone can crank.",
        "The auction_result account must show winner = Pubkey::default() (all zeros)"
      ],
      "discriminator": [
        96,
        187,
        244,
        162,
        223,
        69,
        153,
        119
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Anyone can crank this - permissionless"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.nft_mint",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "auctionResult",
          "docs": [
            "The auction result from arcium_program (cross-program account verification)",
            "Constraint: must be owned by ARCIUM_PROGRAM_ID"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110,
                  95,
                  114,
                  101,
                  115,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                24,
                149,
                14,
                159,
                155,
                138,
                46,
                251,
                126,
                217,
                143,
                8,
                102,
                170,
                11,
                227,
                135,
                163,
                59,
                180,
                65,
                50,
                142,
                198,
                172,
                153,
                209,
                198,
                188,
                220,
                225,
                195
              ]
            }
          }
        },
        {
          "name": "nftEscrowAccount",
          "writable": true
        },
        {
          "name": "sellerNftAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "lockBidFunds",
      "discriminator": [
        117,
        76,
        216,
        205,
        58,
        48,
        193,
        109
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxLockedAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "reclaimUnsold",
      "docs": [
        "Reclaim NFT when auction ends with ZERO bids.",
        "This is needed because:",
        "- cancel_auction requires auction NOT ended",
        "- finalize_no_winner requires AuctionResult (which requires bids to exist)",
        "Only the seller can call this."
      ],
      "discriminator": [
        132,
        48,
        220,
        176,
        66,
        221,
        194,
        13
      ],
      "accounts": [
        {
          "name": "seller",
          "docs": [
            "Only the seller can reclaim"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.nft_mint",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "nftEscrowAccount",
          "writable": true
        },
        {
          "name": "sellerNftAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "refundLoser",
      "discriminator": [
        89,
        15,
        42,
        234,
        40,
        156,
        190,
        136
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "auction"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "settleAuction",
      "docs": [
        "Settle the auction using the verified result from arcium_program",
        "The auction_result account is created by arcium_program after reveal_winner",
        "and contains the plaintext winner/winning_amount verified by MPC"
      ],
      "discriminator": [
        246,
        196,
        183,
        98,
        222,
        139,
        46,
        133
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "winner",
          "writable": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "auctionResult",
          "docs": [
            "The auction result from arcium_program (cross-program account verification)",
            "Constraint: must be owned by ARCIUM_PROGRAM_ID"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110,
                  95,
                  114,
                  101,
                  115,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                24,
                149,
                14,
                159,
                155,
                138,
                46,
                251,
                126,
                217,
                143,
                8,
                102,
                170,
                11,
                227,
                135,
                163,
                59,
                180,
                65,
                50,
                142,
                198,
                172,
                153,
                209,
                198,
                188,
                220,
                225,
                195
              ]
            }
          }
        },
        {
          "name": "winnerBidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "winner"
              }
            ]
          }
        },
        {
          "name": "nftEscrowAccount",
          "writable": true
        },
        {
          "name": "winnerNftAccount",
          "writable": true
        },
        {
          "name": "nftMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "auctionResult",
      "discriminator": [
        182,
        105,
        71,
        113,
        228,
        147,
        117,
        135
      ]
    },
    {
      "name": "bidEscrow",
      "discriminator": [
        146,
        219,
        14,
        4,
        42,
        183,
        243,
        215
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "auctionEnded",
      "msg": "Auction already ended"
    },
    {
      "code": 6001,
      "name": "auctionNotEnded",
      "msg": "Auction not ended"
    },
    {
      "code": 6002,
      "name": "alreadySettled",
      "msg": "Auction already settled"
    },
    {
      "code": 6003,
      "name": "invalidAuctionResult",
      "msg": "Invalid auction result account"
    },
    {
      "code": 6004,
      "name": "resultNotRevealed",
      "msg": "Auction result not revealed yet"
    },
    {
      "code": 6005,
      "name": "auctionMismatch",
      "msg": "Auction ID mismatch"
    },
    {
      "code": 6006,
      "name": "belowMinPrice",
      "msg": "Bid below minimum price"
    },
    {
      "code": 6007,
      "name": "insufficientEscrow",
      "msg": "Insufficient escrow"
    },
    {
      "code": 6008,
      "name": "alreadyWithdrawn",
      "msg": "Funds already withdrawn"
    },
    {
      "code": 6009,
      "name": "bidsAlreadyPlaced",
      "msg": "Cannot cancel auction after bids are placed"
    },
    {
      "code": 6010,
      "name": "auctionNotSettled",
      "msg": "Auction must be settled before refunds"
    },
    {
      "code": 6011,
      "name": "invalidEndTime",
      "msg": "Auction end time must be in the future"
    },
    {
      "code": 6012,
      "name": "invalidMinPrice",
      "msg": "Minimum price must be greater than zero"
    },
    {
      "code": 6013,
      "name": "noValidWinner",
      "msg": "No valid winner exists"
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "minPrice",
            "type": "u64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "bidCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionResult",
      "docs": [
        "AuctionResult account created by arcium_program after reveal_winner",
        "This is a cross-program account - we read it but don't own it"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "docs": [
              "The auction this result belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          },
          {
            "name": "revealed",
            "docs": [
              "Whether the result has been revealed"
            ],
            "type": "bool"
          },
          {
            "name": "winner",
            "docs": [
              "The winner's pubkey (plaintext)"
            ],
            "type": "pubkey"
          },
          {
            "name": "winningAmount",
            "docs": [
              "The winning bid amount in lamports (plaintext)"
            ],
            "type": "u64"
          },
          {
            "name": "revealedAt",
            "docs": [
              "Timestamp when revealed"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bidEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "maxLockedAmount",
            "type": "u64"
          },
          {
            "name": "withdrawn",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};

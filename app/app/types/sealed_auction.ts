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
                "(all bids < min_price or no bids). Permissionless - anyone can crank."
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
                },
                {
                    "name": "sysvarInstructions",
                    "address": "Sysvar1nstructions1111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "proof",
                    "type": {
                        "defined": {
                            "name": "arciumProof"
                        }
                    }
                }
            ]
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
                },
                {
                    "name": "sysvarInstructions",
                    "address": "Sysvar1nstructions1111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "winner",
                    "type": "pubkey"
                },
                {
                    "name": "winningAmount",
                    "type": "u64"
                },
                {
                    "name": "proof",
                    "type": {
                        "defined": {
                            "name": "arciumProof"
                        }
                    }
                }
            ]
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
            "name": "invalidArciumProof",
            "msg": "Invalid Arcium proof"
        },
        {
            "code": 6004,
            "name": "belowMinPrice",
            "msg": "Bid below minimum price"
        },
        {
            "code": 6005,
            "name": "insufficientEscrow",
            "msg": "Insufficient escrow"
        },
        {
            "code": 6006,
            "name": "alreadyWithdrawn",
            "msg": "Funds already withdrawn"
        },
        {
            "code": 6007,
            "name": "bidsAlreadyPlaced",
            "msg": "Cannot cancel auction after bids are placed"
        },
        {
            "code": 6008,
            "name": "auctionNotSettled",
            "msg": "Auction must be settled before refunds"
        },
        {
            "code": 6009,
            "name": "invalidEndTime",
            "msg": "Auction end time must be in the future"
        },
        {
            "code": 6010,
            "name": "invalidMinPrice",
            "msg": "Minimum price must be greater than zero"
        },
        {
            "code": 6011,
            "name": "invalidSignatureCheck",
            "msg": "Ed25519 Signature Verification Failed"
        }
    ],
    "types": [
        {
            "name": "arciumProof",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "messageHash",
                        "type": {
                            "array": [
                                "u8",
                                32
                            ]
                        }
                    },
                    {
                        "name": "signature",
                        "type": {
                            "array": [
                                "u8",
                                64
                            ]
                        }
                    }
                ]
            }
        },
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

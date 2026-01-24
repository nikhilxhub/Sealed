"use client";

import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";

type Transaction = {
    id: string;
    date: string;
    action: string;
    auction: string;
    amount: string;
    status: BadgeStatus;
    txHash: string;
};

// Mock Data
const TRANSACTIONS: Transaction[] = [
    { id: "1", date: "Oct 24, 2025", action: "Bid Submitted", auction: "Cosmic Debris #04", amount: "1.2 ETH", status: "live", txHash: "0x7a...9c21" },
    { id: "2", date: "Oct 22, 2025", action: "Bid Returned", auction: "Neural Gates", amount: "0.8 ETH", status: "outbid", txHash: "0x8b...1d42" },
    { id: "3", date: "Oct 15, 2025", action: "Auction Won", auction: "Abstract Flow", amount: "2.5 ETH", status: "won", txHash: "0x9c...2e53" },
    { id: "4", date: "Oct 10, 2025", action: "Auction Created", auction: "Genesis Block", amount: "-", status: "ended", txHash: "0x1d...4f64" },
];

export default function HistoryPage() {
    return (
        <div className="max-w-[1200px] mx-auto py-12 px-4 md:px-6 animate-fade-in">
            <h1 className="font-display text-3xl text-white mb-8">Transaction History</h1>

            {/* Desktop Table (> 768px) */}
            <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#24262D]">
                            <th className="py-4 pr-4 font-sans text-sm text-[#B5B8C1] font-normal">Date</th>
                            <th className="py-4 pr-4 font-sans text-sm text-[#B5B8C1] font-normal">Action</th>
                            <th className="py-4 pr-4 font-sans text-sm text-[#B5B8C1] font-normal">Auction</th>
                            <th className="py-4 pr-4 font-sans text-sm text-[#B5B8C1] font-normal">Amount</th>
                            <th className="py-4 pr-4 font-sans text-sm text-[#B5B8C1] font-normal">Status</th>
                            <th className="py-4 font-sans text-sm text-[#B5B8C1] font-normal text-right">Tx</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TRANSACTIONS.map((tx) => (
                            <tr
                                key={tx.id}
                                className="group border-b border-[#24262D] hover:bg-[#1A1C22] transition-colors duration-150"
                            >
                                <td className="py-4 pr-4 font-sans text-sm text-[#B5B8C1]">{tx.date}</td>
                                <td className="py-4 pr-4 font-sans text-sm text-white">{tx.action}</td>
                                <td className="py-4 pr-4 font-sans text-sm text-white">{tx.auction}</td>
                                <td className="py-4 pr-4 font-sans text-sm font-medium text-white">{tx.amount}</td>
                                <td className="py-4 pr-4">
                                    <Badge status={tx.status} />
                                </td>
                                <td className="py-4 text-right">
                                    <a
                                        href="#"
                                        className="inline-flex items-center gap-1 text-[#B5B8C1] hover:text-white transition-colors text-xs"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {tx.txHash} <ExternalLink size={12} />
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards (< 768px) */}
            <div className="md:hidden flex flex-col gap-4">
                {TRANSACTIONS.map((tx) => (
                    <div key={tx.id} className="p-4 bg-[#15171C] border border-[#24262D] rounded-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="text-white font-medium mb-1">{tx.action}</div>
                                <div className="text-xs text-[#B5B8C1]">{tx.date}</div>
                            </div>
                            <Badge status={tx.status} />
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-[#24262D] pt-3 mt-1">
                            <span className="text-[#B5B8C1]">{tx.auction}</span>
                            <span className="text-white font-medium">{tx.amount}</span>
                        </div>
                        <div className="mt-3 text-right">
                            <a href="#" className="text-xs text-[#B5B8C1] flex items-center justify-end gap-1">
                                View Transaction <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

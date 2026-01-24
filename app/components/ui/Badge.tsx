import * as React from "react";

export type BadgeStatus = "live" | "upcoming" | "ended" | "won" | "outbid" | "pending" | "failed";

interface BadgeProps {
    status: BadgeStatus;
    className?: string;
    label?: string; // Optional override
}

export function Badge({ status, className = "", label }: BadgeProps) {
    const styles = {
        live: "text-[#EDEDED]",
        won: "text-[#EDEDED]",
        upcoming: "text-[#B5B8C1]",
        outbid: "text-[#B5B8C1]",
        pending: "text-[#B5B8C1]",
        ended: "text-[#6B6E76]",
        failed: "text-[#C35A5A]",
    };

    const statusLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <span
            className={`
        inline-flex items-center 
        font-medium text-xs uppercase tracking-[0.08em]
        ${styles[status] || "text-white"}
        ${className}
      `}
        >
            {statusLabel}
        </span>
    );
}

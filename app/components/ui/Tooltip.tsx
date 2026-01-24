"use client";

import * as React from "react";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, 200); // 200ms delay
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {isVisible && (
                <div
                    className="absolute z-50 px-3 py-2 text-xs text-[#B5B8C1] bg-[#24262D] rounded-sm whitespace-nowrap
            bottom-full left-1/2 -translate-x-1/2 mb-2
            animate-fade-in"
                    style={{ maxWidth: '240px' }}
                >
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#24262D]" />
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = props.value !== "" && props.value !== undefined;

    return (
        <div className={`relative flex flex-col ${className}`}>
            <div className="relative">
                <input
                    {...props}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    className={`
            w-full bg-transparent border-b border-foreground/20 py-4 pt-6 text-xl font-sans text-foreground outline-none transition-colors duration-300
            ${error ? "border-red-500/50" : isFocused ? "border-foreground" : "border-foreground/20"}
          `}
                    placeholder=" "
                />
                <label
                    className={`
            absolute left-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
            ${(isFocused || hasValue)
                            ? "top-0 text-xs text-foreground/50"
                            : "top-5 text-lg text-foreground/30"}
          `}
                >
                    {label}
                </label>
            </div>
            {error && (
                <span className="text-xs text-red-500/80 mt-2 font-mono opacity-0 animate-fade-in">
                    {error}
                </span>
            )}
        </div>
    );
}

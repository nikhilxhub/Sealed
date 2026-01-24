"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputWithLabelProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export function InputWithLabel({ label, error, className = "", id, ...props }: InputWithLabelProps) {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = props.value !== "" && props.value !== undefined;
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className={cn("relative flex flex-col space-y-2", className)}>
            <Label 
                htmlFor={inputId}
                className={cn(
                    "absolute left-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    (isFocused || hasValue)
                        ? "top-0 text-xs text-muted-foreground"
                        : "top-3 text-base text-muted-foreground"
                )}
            >
                {label}
            </Label>
            <div className="relative">
                <Input
                    {...props}
                    id={inputId}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    className={cn(
                        "pt-6 pb-2",
                        error && "border-destructive focus-visible:ring-destructive/20"
                    )}
                    aria-invalid={error ? "true" : undefined}
                />
            </div>
            {error && (
                <span className="text-xs text-destructive mt-1 font-mono opacity-0 animate-fade-in">
                    {error}
                </span>
            )}
        </div>
    );
}


"use client";

import React from "react";
import Link from "next/link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "ghost" | "link";
    href?: string;
    className?: string;
}

export function Button({
    children,
    variant = "primary",
    href,
    className = "",
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-sans transition-all duration-300 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-foreground text-background px-6 py-3 border border-transparent hover:bg-transparent hover:text-foreground hover:border-foreground",
        ghost: "bg-transparent text-foreground border border-foreground/20 hover:border-foreground px-6 py-3",
        link: "bg-transparent text-foreground p-0 hover:text-foreground/80 relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-[1px] after:bottom-0 after:left-0 after:bg-current after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={combinedClassName}>
                {children}
            </Link>
        );
    }

    return (
        <button className={combinedClassName} {...props}>
            {children}
        </button>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    // Scroll effect
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const navLinks = [
        { href: "/how-it-works", label: "Protocol" },
        { href: "/explore", label: "Auctions" },
        { href: "/activity", label: "My Activity" },
        // { href: "/create", label: "Create" }, // Skipped for now
    ];

    const isAuctionPage = pathname.startsWith("/auctions/");

    return (
        <header
            className={`
                fixed top-0 left-0 right-0 z-40 transition-all duration-300
                ${isScrolled || isAuctionPage ? "bg-[#050505] border-b border-[#333333]" : "bg-transparent"}
            `}
        >
            <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="font-display text-2xl text-white tracking-tight z-50">
                    Sealed Bid
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`
                                text-sm font-medium transition-colors hover:text-white hover:underline underline-offset-4
                                ${pathname === link.href ? "text-white" : "text-[#B5B8C1]"}
                            `}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Right (Wallet/Settings) */}
                <div className="hidden md:flex items-center gap-6">
                    <Link href="/settings" className="text-sm text-[#B5B8C1] hover:text-white transition-colors">
                        Settings
                    </Link>
                    <WalletMultiButton style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #24262D',
                        borderRadius: '9999px', // rounded-full
                        padding: '6px 12px',
                        height: 'auto',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: 'white',
                        lineHeight: '1',
                    }} />
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden z-50 text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu Overlay */}
                <div
                    className={`
                        fixed inset-0 bg-[#0E0F12] z-40 flex flex-col pt-24 px-6
                        transition-transform duration-300 ease-in-out
                        ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}
                    `}
                >
                    <nav className="flex flex-col gap-8">
                        {navLinks.map((link, i) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`
                                    text-2xl font-display text-white border-b border-[#24262D] pb-4 flex justify-between items-center
                                    opacity-0 animate-rise-up
                                `}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                {link.label}
                                <ChevronRight className="text-[#24262D]" />
                            </Link>
                        ))}
                        <Link
                            href="/settings"
                            className="text-2xl font-display text-white border-b border-[#24262D] pb-4 flex justify-between items-center opacity-0 animate-rise-up"
                            style={{ animationDelay: "300ms" }}
                        >
                            Settings
                            <ChevronRight className="text-[#24262D]" />
                        </Link>
                    </nav>

                    <div className="mt-auto mb-12 opacity-0 animate-fade-in delay-500 w-full flex justify-center">
                        <WalletMultiButton style={{
                            backgroundColor: '#0E0F12',
                            border: '1px solid #24262D',
                            width: '100%',
                            justifyContent: 'center',
                            borderRadius: '4px'
                        }} />
                    </div>
                </div>

            </div>
        </header>
    );

}

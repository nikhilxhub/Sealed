"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Wallet, ChevronRight } from "lucide-react";

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
        { href: "/explore", label: "Explore" },
        { href: "/activity", label: "My Activity" },
        // { href: "/create", label: "Create" }, // Skipped for now
    ];

    return (
        <header
            className={`
                fixed top-0 left-0 right-0 z-40 transition-all duration-300
                ${isScrolled ? "bg-[#0E0F12]/95 backdrop-blur-sm border-b border-[#24262D]" : "bg-transparent"}
            `}
        >
            <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="font-display text-2xl text-white tracking-tight z-50">
                    Sealed
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`
                                text-sm font-medium transition-colors hover:text-white
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
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-[#24262D] rounded-full">
                        <div className="w-2 h-2 rounded-full bg-[#EDEDED]"></div>
                        <span className="text-xs font-mono text-white">0x7a...9c21</span>
                    </div>
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

                    <div className="mt-auto mb-12 opacity-0 animate-fade-in delay-500">
                        <div className="flex items-center gap-3 p-4 border border-[#24262D] rounded-sm">
                            <Wallet size={20} className="text-[#EDEDED]" />
                            <span className="font-mono text-sm text-white">0x7a...9c21</span>
                            <div className="ml-auto w-2 h-2 rounded-full bg-[#EDEDED]" />
                        </div>
                    </div>
                </div>

            </div>
        </header>
    );
}

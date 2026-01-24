"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
    const [copied, setCopied] = useState(false);
    const address = "0x71C...9A23"; // Mock address

    const handleCopy = () => {
        navigator.clipboard.writeText("0x71C7656EC7ab88b098defB751B7401B5f6d89A23");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="w-full max-w-sm flex flex-col items-center gap-12 opacity-0 animate-fade-in">

                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center font-mono text-2xl text-foreground/40">
                        0x
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="ghost"
                            onClick={handleCopy}
                            className="font-mono text-lg hover:text-foreground/70 transition-colors h-auto p-0"
                        >
                            {address}
                        </Button>
                        <span className={`text-[10px] uppercase tracking-widest transition-opacity duration-300 ${copied ? "opacity-100 text-green-500/70" : "opacity-0"}`}>
                            Copied to Board
                        </span>
                    </div>
                </div>

                <div className="w-full h-[1px] bg-foreground/5" />

                <Button variant="ghost" className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 w-48 text-sm">
                    Disconnect Identity
                </Button>

            </div>
        </main>
    );
}

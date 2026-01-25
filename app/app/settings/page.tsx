"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-[#24262D] last:border-0">
            <label className="font-sans text-sm text-[#B5B8C1] select-none cursor-pointer" onClick={() => onChange(!checked)}>
                {label}
            </label>
            <button
                onClick={() => onChange(!checked)}
                className={`
          relative w-10 h-6 border transition-colors duration-150 ease-out
          ${checked ? "bg-white border-white" : "bg-transparent border-[#24262D]"}
          rounded-none
        `}
            >
                {checked && (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#0E0F12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                )}
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const { addToast } = useToast();
    const [notifications, setNotifications] = React.useState({
        auctionEnding: true,
        outbid: true,
        auctionWon: true,
    });

    const [currency, setCurrency] = React.useState<"SOL" | "USD">("SOL");
    const [wallet, setWallet] = React.useState("0x7a...9c21"); // Mock connected wallet

    const handleNotificationChange = (key: keyof typeof notifications) => (val: boolean) => {
        setNotifications(prev => ({ ...prev, [key]: val }));
        showSaved(); // Simulate save
    };

    const showSaved = () => {
        // In a real app, this would debounce or save on blur
        // For effect, we just show a toast or a small text indicator
        const el = document.getElementById("saved-indicator");
        if (el) {
            el.style.opacity = "1";
            setTimeout(() => {
                el.style.opacity = "0";
            }, 2000);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
            <div className="flex items-baseline justify-between mb-8">
                <h1 className="font-display text-3xl text-white">Settings</h1>
                <span id="saved-indicator" className="text-xs text-[#EDEDED] opacity-0 transition-opacity duration-300">Saved</span>
            </div>

            <div className="space-y-12">
                {/* Notifications */}
                <section>
                    <h2 className="font-sans font-medium text-white mb-4 border-b border-[#24262D] pb-2">Notifications</h2>
                    <div>
                        <Toggle
                            label="Auction ending soon"
                            checked={notifications.auctionEnding}
                            onChange={handleNotificationChange("auctionEnding")}
                        />
                        <Toggle
                            label="Outbid alert"
                            checked={notifications.outbid}
                            onChange={handleNotificationChange("outbid")}
                        />
                        <Toggle
                            label="Auction won"
                            checked={notifications.auctionWon}
                            onChange={handleNotificationChange("auctionWon")}
                        />
                    </div>
                </section>

                {/* Display */}
                <section>
                    <h2 className="font-sans font-medium text-white mb-4 border-b border-[#24262D] pb-2">Display</h2>
                    <div className="flex items-center justify-between py-4 border-b border-[#24262D]">
                        <span className="font-sans text-sm text-[#B5B8C1]">Currency Display</span>
                        <div className="flex gap-4">
                            <button
                                onClick={() => { setCurrency("SOL"); showSaved(); }}
                                className={`text-sm ${currency === "SOL" ? "text-white underline" : "text-[#6B6E76]"}`}
                            >
                                SOL
                            </button>
                            <button
                                onClick={() => { setCurrency("USD"); showSaved(); }}
                                className={`text-sm ${currency === "USD" ? "text-white underline" : "text-[#6B6E76]"}`}
                            >
                                USD
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-4 border-[#24262D]">
                        <span className="font-sans text-sm text-[#B5B8C1]">Timezone</span>
                        <span className="font-sans text-sm text-white">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                    </div>
                </section>

                {/* Account */}
                <section>
                    <h2 className="font-sans font-medium text-white mb-4 border-b border-[#24262D] pb-2">Account</h2>
                    <div className="flex items-center justify-between py-4">
                        <span className="font-sans text-sm text-[#B5B8C1]">Connected Wallet</span>
                        <div className="flex items-center gap-4">
                            <span className="font-sans text-sm text-white font-mono">{wallet}</span>
                            <button
                                onClick={() => {
                                    setWallet("");
                                    addToast("Wallet disconnected", "neutral");
                                }}
                                className="text-xs text-[#C35A5A] hover:text-red-400 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

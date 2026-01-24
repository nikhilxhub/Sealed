import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full py-8 px-6 border-t border-[#24262D] mt-auto">
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="text-xs text-[#6B6E76] font-sans">
                    © 2026 Sealed Protocol. All rights reserved.
                </div>

                <div className="flex items-center gap-6">
                    <Link href="#" className="text-xs text-[#B5B8C1] hover:text-white transition-colors">Terms</Link>
                    <Link href="#" className="text-xs text-[#B5B8C1] hover:text-white transition-colors">Privacy</Link>
                    <Link href="#" className="text-xs text-[#B5B8C1] hover:text-white transition-colors">Documentation</Link>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#24262D]"></div>
                    <span className="text-[10px] text-[#6B6E76] uppercase tracking-widest font-mono">
                        Mainnet Beta
                    </span>
                </div>

            </div>
        </footer>
    );
}

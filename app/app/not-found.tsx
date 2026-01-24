import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in-slow">
            <h1 className="font-display text-[1.75rem] text-white mb-4">Page not found</h1>
            <p className="font-sans text-[#B5B8C1] mb-8">
                This auction may have ended or the link is incorrect.
            </p>
            <Link
                href="/explore"
                className="
          flex items-center gap-2 
          font-sans text-[#EDEDED] font-medium 
          hover:underline decoration-[#EDEDED] decoration-1 underline-offset-4
          transition-all
        "
            >
                <ArrowLeft size={16} /> Return to auctions
            </Link>
        </div>
    );
}

export default function Loading() {
    return (
        <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-[1px] w-24 bg-[#333333] overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-full bg-white origin-left animate-[progress_1s_ease-in-out_infinite]" />
                </div>
                <span className="font-mono text-[10px] text-[#666] uppercase tracking-[0.2em]">Loading Assets</span>
            </div>
        </main>
    );
}

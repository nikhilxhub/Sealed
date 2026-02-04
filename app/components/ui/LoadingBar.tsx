"use client";

import React, { useEffect, useState } from "react";
import { useLoading } from "@/components/providers/LoadingProvider";

export const LoadingBar = () => {
    const { isLoading } = useLoading();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            setVisible(true);
            setProgress(0);
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) return prev;
                    return prev + (100 - prev) * 0.1;
                });
            }, 100);
        } else {
            setProgress(100);
            const timeout = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 300);
            return () => clearTimeout(timeout);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 w-full h-[2px] z-[9999] pointer-events-none">
            <div
                className="h-full bg-white transition-all duration-300 ease-out"
                style={{
                    width: `${progress}%`,
                    boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)"
                }}
            />
        </div>
    );
};

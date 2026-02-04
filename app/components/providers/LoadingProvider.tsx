"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface LoadingContextType {
    setIsLoading: (loading: boolean) => void;
    isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
    setIsLoading: () => { },
    isLoading: false,
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Reset loading state on route change
    useEffect(() => {
        setIsLoading(false);
    }, [pathname, searchParams]);

    return (
        <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

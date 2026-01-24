"use client";

import * as React from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    className?: string;
}

export function Modal({ isOpen, onClose, children, title, className = "" }: ModalProps) {
    const [show, setShow] = React.useState(isOpen);

    React.useEffect(() => {
        if (isOpen) {
            setShow(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setShow(false), 200); // Wait for fade out
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!show) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0A0B0D]/90"
                onClick={onClose}
            />

            {/* Content */}
            <div
                className={`
          relative w-full max-w-[420px] 
          bg-[#15171C] border border-[#24262D] rounded-sm 
          shadow-2xl 
          transition-all duration-300 transform
          ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
          ${className}
        `}
            >
                <div className="flex items-center justify-between p-6 pb-2">
                    {title && <h2 className="text-xl font-display text-white">{title}</h2>}
                    <button
                        onClick={onClose}
                        className="text-[#B5B8C1] hover:text-white transition-colors ml-auto"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 pt-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
    label: string;
    value: string;
}

interface DropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function Dropdown({ options, value, onChange, placeholder = "Select...", className = "" }: DropdownProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find((opt) => opt.value === value)?.label;

    return (
        <div className={`relative w-full ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center justify-between w-full px-0 py-2
          bg-transparent border-none
          text-sm text-left
          focus:outline-none focus:ring-0
          transition-all duration-200
          hover:text-white
          ${isOpen ? "text-white" : "text-[#B5B8C1]"}
        `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={value ? "text-white" : "text-inherit"}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown
                    className={`w-3 h-3 ml-2 text-inherit opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#15171C] border border-[#24262D] rounded-sm animate-fade-in overflow-hidden shadow-xl">
                    <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
                        {options.map((option) => (
                            <li
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                  flex items-center justify-between px-4 py-3 cursor-pointer text-sm
                  transition-colors duration-120
                  ${option.value === value ? "text-white bg-[#1A1C22]" : "text-[#B5B8C1] hover:bg-[#1A1C22] hover:text-white"}
                `}
                                role="option"
                                aria-selected={option.value === value}
                            >
                                {option.label}
                                {option.value === value && <Check className="w-4 h-4" />}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

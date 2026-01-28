"use client";

import * as React from "react";
import { Dropdown } from "./Dropdown";

interface DatePickerProps {
    date: Date | null;
    onChange: (date: Date | null) => void;
}

export function DatePicker({ date, onChange }: DatePickerProps) {
    // Helpers to parse date
    const [month, setMonth] = React.useState(date ? (date.getMonth() + 1).toString() : "");
    const [day, setDay] = React.useState(date ? date.getDate().toString() : "");
    const [year, setYear] = React.useState(date ? date.getFullYear().toString() : "");

    const [hour, setHour] = React.useState(date ? (date.getHours() % 12 || 12).toString() : "");
    const [minute, setMinute] = React.useState(date ? date.getMinutes().toString().padStart(2, '0') : "");
    const [ampm, setAmpm] = React.useState(date ? (date.getHours() >= 12 ? "PM" : "AM") : "AM");

    const [isValid, setIsValid] = React.useState(true);

    // Validate and update parent
    React.useEffect(() => {
        if (month && day && year && hour && minute) {
            const m = parseInt(month);
            const d = parseInt(day);
            const y = parseInt(year);
            let h = parseInt(hour);
            const min = parseInt(minute);

            if (ampm === "PM" && h !== 12) h += 12;
            if (ampm === "AM" && h === 12) h = 0;

            const newDate = new Date(y, m - 1, d, h, min);

            // Basic validation check (valid date)
            if (!isNaN(newDate.getTime())) {
                const isFuture = newDate.getTime() > Date.now();

                // Check if the date rolled over (e.g. Month 15 -> March, Day 32 -> 1st)
                // We want to strictly enforce Month 1-12 and Day 1-31 (or 28/29/30 depending on month)
                const isValidDateComponents =
                    newDate.getMonth() + 1 === m &&
                    newDate.getDate() === d;

                const valid = isFuture && isValidDateComponents;
                setIsValid(valid);

                if (valid) {
                    onChange(newDate);
                } else {
                    onChange(null);
                }
            } else {
                setIsValid(false);
                onChange(null);
            }
        } else {
            setIsValid(true); // Reset validity when clearing inputs or incomplete
            onChange(null);
        }
    }, [month, day, year, hour, minute, ampm]);

    // Refs for focus management
    const monthRef = React.useRef<HTMLInputElement>(null);
    const dayRef = React.useRef<HTMLInputElement>(null);
    const yearRef = React.useRef<HTMLInputElement>(null);
    const hourRef = React.useRef<HTMLInputElement>(null);
    const minuteRef = React.useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | null>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            nextRef.current?.focus();
        }
    };

    const inputClass = `w-full bg-transparent border rounded-sm px-3 py-2 text-center text-white focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none !outline-none !ring-0 transition-colors placeholder:text-[#24262D] ${isValid ? 'border-[#24262D] focus:border-white' : 'border-red-500 focus:border-red-500'
        }`;

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
                <input
                    ref={monthRef}
                    type="text"
                    placeholder="MM"
                    value={month}
                    onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    onKeyDown={(e) => handleKeyDown(e, dayRef)}
                    className={inputClass}
                />
                <input
                    ref={dayRef}
                    type="text"
                    placeholder="DD"
                    value={day}
                    onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    onKeyDown={(e) => handleKeyDown(e, yearRef)}
                    className={inputClass}
                />
                <input
                    ref={yearRef}
                    type="text"
                    placeholder="YYYY"
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={(e) => handleKeyDown(e, hourRef)}
                    className={inputClass}
                />
            </div>
            <div className="flex gap-2 items-center">
                <input
                    ref={hourRef}
                    type="text"
                    placeholder="HH"
                    value={hour}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                        if (parseInt(val) > 12) return;
                        setHour(val);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, minuteRef)}
                    className={inputClass}
                />
                <span className="text-[#B5B8C1]">:</span>
                <input
                    ref={minuteRef}
                    type="text"
                    placeholder="MM"
                    value={minute}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                        if (parseInt(val) > 59) return;
                        setMinute(val);
                    }}
                    className={inputClass}
                />
                <div className="w-24">
                    <Dropdown
                        options={[{ label: "AM", value: "AM" }, { label: "PM", value: "PM" }]}
                        value={ampm}
                        onChange={setAmpm}
                    />
                </div>
            </div>
            <p className="text-[10px] text-[#666] font-mono text-right uppercase tracking-wider">Time (12h format)</p>
        </div>
    );
}

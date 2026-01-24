"use client";

import * as React from "react";
import { Dropdown } from "./Dropdown";

interface DatePickerProps {
    date: Date | null;
    onChange: (date: Date) => void;
}

export function DatePicker({ date, onChange }: DatePickerProps) {
    // Helpers to parse date
    const [month, setMonth] = React.useState(date ? (date.getMonth() + 1).toString() : "");
    const [day, setDay] = React.useState(date ? date.getDate().toString() : "");
    const [year, setYear] = React.useState(date ? date.getFullYear().toString() : "");

    const [hour, setHour] = React.useState(date ? (date.getHours() % 12 || 12).toString() : "");
    const [minute, setMinute] = React.useState(date ? date.getMinutes().toString().padStart(2, '0') : "");
    const [ampm, setAmpm] = React.useState(date ? (date.getHours() >= 12 ? "PM" : "AM") : "AM");

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
                onChange(newDate);
            }
        }
    }, [month, day, year, hour, minute, ampm, onChange]);

    const inputClass = "w-full bg-transparent border border-[#24262D] rounded-sm px-3 py-2 text-center text-white focus:border-white focus:outline-none transition-colors placeholder:text-[#24262D]";

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
                <input
                    type="text"
                    placeholder="MM"
                    value={month}
                    onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className={inputClass}
                />
                <input
                    type="text"
                    placeholder="DD"
                    value={day}
                    onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className={inputClass}
                />
                <input
                    type="text"
                    placeholder="YYYY"
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={inputClass}
                />
            </div>
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    placeholder="HH"
                    value={hour}
                    onChange={(e) => setHour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className={inputClass}
                />
                <span className="text-[#B5B8C1]">:</span>
                <input
                    type="text"
                    placeholder="MM"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value.replace(/\D/g, '').slice(0, 2))}
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
        </div>
    );
}

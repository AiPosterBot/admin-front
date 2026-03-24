import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

interface PeriodPickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  align?: "start" | "end" | "center";
  placeholder?: string;
}

export function PeriodPicker({
  value,
  onChange,
  align = "start",
  placeholder = "Период",
}: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [numberOfMonths, setNumberOfMonths] = useState(2);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const updateMonths = () => setNumberOfMonths(mediaQuery.matches ? 2 : 1);

    updateMonths();
    mediaQuery.addEventListener("change", updateMonths);
    return () => mediaQuery.removeEventListener("change", updateMonths);
  }, []);

  const label = value?.from
    ? value.to
      ? `${value.from.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${value.to.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`
      : value.from.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 h-8 text-sm ${value ? "border-blue-400 text-blue-700 bg-blue-50" : ""}`}
        >
          <CalendarIcon className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[calc(100vw-1rem)] w-auto p-0" align={align}>
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            onChange(range);
            if (range?.from && range?.to) setOpen(false);
          }}
          numberOfMonths={numberOfMonths}
          disabled={{ after: new Date() }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/** Проверяет, попадает ли дата в выбранный диапазон */
export function isInPeriod(dateStr: string, range: DateRange | undefined): boolean {
  if (!range?.from) return true;
  const d = new Date(dateStr);
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  if (d < from) return false;
  if (range.to) {
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    if (d > to) return false;
  }
  return true;
}

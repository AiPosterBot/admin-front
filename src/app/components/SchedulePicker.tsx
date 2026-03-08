import { useState, useEffect } from "react";
import { Plus, X, Clock, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";

const WEEKDAYS = [
  { key: "mon", label: "Пн", cronDay: 1 },
  { key: "tue", label: "Вт", cronDay: 2 },
  { key: "wed", label: "Ср", cronDay: 3 },
  { key: "thu", label: "Чт", cronDay: 4 },
  { key: "fri", label: "Пт", cronDay: 5 },
  { key: "sat", label: "Сб", cronDay: 6 },
  { key: "sun", label: "Вс", cronDay: 0 },
];

const TIMEZONES = [
  "UTC",
  "Europe/Moscow",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
];

const DAY_PRESETS = [
  { label: "Каждый день", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
  { label: "Рабочие дни", days: ["mon", "tue", "wed", "thu", "fri"] },
  { label: "Выходные", days: ["sat", "sun"] },
];

interface ScheduleValue {
  days: string[];
  times: string[];
  timezone: string;
}

interface SchedulePickerProps {
  value?: ScheduleValue;
  onChange?: (value: ScheduleValue) => void;
}

// Преобразует ScheduleValue в cron-выражение
export function scheduleToCron(schedule: ScheduleValue): string {
  if (!schedule.times.length || !schedule.days.length) return "";
  const times = schedule.times
    .map(t => t.split(":"))
    .sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1]) - Number(b[1]));
  const hours = [...new Set(times.map(t => t[0]))].join(",");
  const minutes = times[0][1]; // берём минуты первого слота (упрощение)

  const allDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const isEveryDay = allDays.every(d => schedule.days.includes(d));
  if (isEveryDay) return `${minutes} ${hours} * * *`;

  const cronDays = schedule.days
    .map(d => WEEKDAYS.find(w => w.key === d)?.cronDay)
    .filter(d => d !== undefined)
    .sort()
    .join(",");
  return `${minutes} ${hours} * * ${cronDays}`;
}

// Преобразует человекочитаемое описание расписания
export function scheduleToHuman(schedule: ScheduleValue): string {
  if (!schedule.times.length || !schedule.days.length) return "Не настроено";

  const allDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const weekdays = ["mon", "tue", "wed", "thu", "fri"];
  const weekend = ["sat", "sun"];

  let daysLabel = "";
  if (allDays.every(d => schedule.days.includes(d))) {
    daysLabel = "каждый день";
  } else if (weekdays.every(d => schedule.days.includes(d)) && schedule.days.length === 5) {
    daysLabel = "по рабочим дням";
  } else if (weekend.every(d => schedule.days.includes(d)) && schedule.days.length === 2) {
    daysLabel = "по выходным";
  } else {
    daysLabel = schedule.days
      .map(d => WEEKDAYS.find(w => w.key === d)?.label)
      .filter(Boolean)
      .join(", ");
  }

  const timesList = schedule.times
    .sort()
    .map(t => t.replace(/^0(\d)/, "$1") + " " + schedule.timezone);

  return `${daysLabel} в ${timesList.join(", ")}`;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(
    value?.days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  );
  const [times, setTimes] = useState<string[]>(value?.times || ["09:00"]);
  const [timezone, setTimezone] = useState(value?.timezone || "UTC");
  const [newTime, setNewTime] = useState("12:00");

  useEffect(() => {
    onChange?.({ days: selectedDays, times, timezone });
  }, [selectedDays, times, timezone]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const applyPreset = (days: string[]) => {
    setSelectedDays(days);
  };

  const addTime = () => {
    if (newTime && !times.includes(newTime)) {
      setTimes(prev => [...prev, newTime].sort());
    }
  };

  const removeTime = (time: string) => {
    if (times.length > 1) {
      setTimes(prev => prev.filter(t => t !== time));
    }
  };

  const human = scheduleToHuman({ days: selectedDays, times, timezone });
  const cron = scheduleToCron({ days: selectedDays, times, timezone });

  return (
    <div className="space-y-5">
      {/* Дни недели */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Дни недели</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map(day => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                selectedDays.includes(day.key)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          {DAY_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.days)}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Время публикации */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Время публикации</Label>
        <div className="flex flex-wrap gap-2">
          {times.map(time => (
            <div
              key={time}
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1"
            >
              <Clock className="size-3.5 text-blue-500" />
              <span className="text-sm font-medium text-blue-800">{time}</span>
              <button
                type="button"
                onClick={() => removeTime(time)}
                disabled={times.length === 1}
                className="text-blue-400 hover:text-blue-600 disabled:opacity-30"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            className="border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTime}
            disabled={!newTime || times.includes(newTime)}
          >
            <Plus className="size-3.5 mr-1" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Часовой пояс */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Часовой пояс</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="size-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <span className="font-medium">Итого: </span>
            {selectedDays.length === 0 || times.length === 0
              ? <span className="text-red-500">Выберите дни и время</span>
              : human}
          </div>
        </div>
      </div>
    </div>
  );
}
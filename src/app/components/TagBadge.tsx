import { X } from "lucide-react";
import type { TagColor } from "../data/mock-data";

const TAG_COLOR_MAP: Record<TagColor, { bg: string; text: string; border: string }> = {
  red:    { bg: "bg-red-50 dark:bg-red-950",       text: "text-red-700 dark:text-red-300",       border: "border-red-200 dark:border-red-800" },
  blue:   { bg: "bg-blue-50 dark:bg-blue-950",     text: "text-blue-700 dark:text-blue-300",     border: "border-blue-200 dark:border-blue-800" },
  green:  { bg: "bg-green-50 dark:bg-green-950",   text: "text-green-700 dark:text-green-300",   border: "border-green-200 dark:border-green-800" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-950",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-200 dark:border-amber-800" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  pink:   { bg: "bg-pink-50 dark:bg-pink-950",     text: "text-pink-700 dark:text-pink-300",     border: "border-pink-200 dark:border-pink-800" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-950",     text: "text-teal-700 dark:text-teal-300",     border: "border-teal-200 dark:border-teal-800" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
};

export const TAG_DOT_COLORS: Record<TagColor, string> = {
  red:    "bg-red-400",
  blue:   "bg-blue-400",
  green:  "bg-green-400",
  amber:  "bg-amber-400",
  purple: "bg-purple-400",
  pink:   "bg-pink-400",
  teal:   "bg-teal-400",
  orange: "bg-orange-400",
};

interface TagBadgeProps {
  name: string;
  color: TagColor;
  onRemove?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function TagBadge({ name, color, onRemove, size = "sm", className = "" }: TagBadgeProps) {
  const c = TAG_COLOR_MAP[color];
  const sizeClass = size === "sm"
    ? "text-[11px] px-1.5 py-0 leading-5 gap-1"
    : "text-xs px-2 py-0.5 leading-5 gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-md border ${c.bg} ${c.text} ${c.border} ${sizeClass} ${className}`}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-70 transition-opacity -mr-0.5"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
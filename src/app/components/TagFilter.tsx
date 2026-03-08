import { Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { TagBadge, TAG_DOT_COLORS } from "./TagBadge";
import type { TagColor } from "../data/mock-data";

interface TagItem {
  id: string;
  name: string;
  color: TagColor;
}

interface TagFilterProps {
  tags: TagItem[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
}

export function TagFilter({ tags, selectedTagIds, onChange, label = "Теги" }: TagFilterProps) {
  if (tags.length === 0) return null;

  const toggle = (tagId: string) => {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter(id => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  const hasSelection = selectedTagIds.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors border ${
            hasSelection
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <Tag className="size-3.5" />
          {label}
          {hasSelection && (
            <span className="bg-blue-100 text-blue-700 text-[10px] rounded-full px-1.5 leading-4 tabular-nums">
              {selectedTagIds.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {tags.map(tag => {
            const checked = selectedTagIds.includes(tag.id);
            return (
              <label
                key={tag.id}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  checked ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(tag.id)}
                  className="size-3.5"
                />
                <div className={`size-2 rounded-full ${TAG_DOT_COLORS[tag.color]}`} />
                <span className="text-sm text-gray-700 truncate">{tag.name}</span>
              </label>
            );
          })}
        </div>
        {hasSelection && (
          <div className="border-t mt-1.5 pt-1.5">
            <button
              onClick={() => onChange([])}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors w-full text-left"
            >
              Сбросить
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

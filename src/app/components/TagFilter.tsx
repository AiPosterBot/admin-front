import { Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { TagBadge, TAG_DOT_COLORS } from "./TagBadge";
import type { TagColor } from "../types/domain";

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
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
            hasSelection
              ? "border-primary/50 bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Tag className="size-3.5" />
          {label}
          {hasSelection && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] leading-4 tabular-nums text-primary">
              {selectedTagIds.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 border-border bg-popover p-2">
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {tags.map(tag => {
            const checked = selectedTagIds.includes(tag.id);
            return (
              <label
                key={tag.id}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  checked ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(tag.id)}
                  className="size-3.5"
                />
                <div className={`size-2 rounded-full ${TAG_DOT_COLORS[tag.color]}`} />
                <span className="truncate text-sm text-foreground">{tag.name}</span>
              </label>
            );
          })}
        </div>
        {hasSelection && (
          <div className="mt-1.5 border-t border-border pt-1.5">
            <button
              onClick={() => onChange([])}
              className="w-full px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Сбросить
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TAG_DOT_COLORS } from "./TagBadge";
import type { TagColor, ChannelTag, SourceTag } from "../data/mock-data";
import {
  TAG_COLORS,
  addChannelTag,
  addSourceTag,
  assignChannelTag,
  removeChannelTagLink,
  assignSourceTag,
  removeSourceTagLink,
} from "../data/mock-data";

interface AssignTagsPopoverProps {
  entityId: string;
  teamId: string;
  kind: "channel" | "source";
  allTags: (ChannelTag | SourceTag)[];
  assignedTagIds: string[];
  onChanged: () => void;
}

export function AssignTagsPopover({
  entityId,
  teamId,
  kind,
  allTags,
  assignedTagIds,
  onChanged,
}: AssignTagsPopoverProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("blue");

  const toggle = (tagId: string) => {
    if (assignedTagIds.includes(tagId)) {
      if (kind === "channel") removeChannelTagLink(entityId, tagId);
      else removeSourceTagLink(entityId, tagId);
    } else {
      if (kind === "channel") assignChannelTag(entityId, tagId);
      else assignSourceTag(entityId, tagId);
    }
    onChanged();
  };

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    let tag: ChannelTag | SourceTag;
    if (kind === "channel") {
      tag = addChannelTag(teamId, trimmed, newColor);
      assignChannelTag(entityId, tag.id);
    } else {
      tag = addSourceTag(teamId, trimmed, newColor);
      assignSourceTag(entityId, tag.id);
    }
    setNewName("");
    setShowCreate(false);
    onChanged();
    toast.success(`Тег "${trimmed}" создан и присвоен`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100">
          <Tag className="size-3" />
          <Plus className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <p className="text-xs font-medium text-gray-500 px-2 mb-1.5">Теги</p>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {allTags.length === 0 && !showCreate && (
            <p className="text-xs text-gray-400 px-2 py-2">Тегов пока нет</p>
          )}
          {allTags.map(tag => {
            const checked = assignedTagIds.includes(tag.id);
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

        {showCreate ? (
          <div className="border-t mt-1.5 pt-2 space-y-2">
            <div className="flex gap-1 px-1">
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`size-4 rounded-full ${TAG_DOT_COLORS[c]} transition-all ${
                    newColor === c ? "ring-2 ring-offset-1 ring-gray-400" : ""
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Имя тега..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                className="h-7 text-xs flex-1"
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs px-2" onClick={handleCreate} disabled={!newName.trim()}>
                OK
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t mt-1.5 pt-1.5">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 transition-colors"
            >
              <Plus className="size-3" />
              Создать тег
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

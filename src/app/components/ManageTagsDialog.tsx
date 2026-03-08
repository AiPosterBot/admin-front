import { useState } from "react";
import { Plus, Trash2, Check, X, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TagBadge, TAG_DOT_COLORS } from "./TagBadge";
import type { TagColor, ChannelTag, SourceTag } from "../data/mock-data";
import {
  TAG_COLORS,
  addChannelTag,
  addSourceTag,
  deleteChannelTag,
  deleteSourceTag,
  renameChannelTag,
  renameSourceTag,
} from "../data/mock-data";

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  kind: "channel" | "source";
  tags: (ChannelTag | SourceTag)[];
  onChanged: () => void;
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  teamId,
  kind,
  tags,
  onChanged,
}: ManageTagsDialogProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("blue");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Тег с таким именем уже существует");
      return;
    }
    if (kind === "channel") {
      addChannelTag(teamId, trimmed, newColor);
    } else {
      addSourceTag(teamId, trimmed, newColor);
    }
    setNewName("");
    onChanged();
    toast.success(`Тег "${trimmed}" создан`);
  };

  const handleDelete = (tagId: string, tagName: string) => {
    const count = kind === "channel" ? deleteChannelTag(tagId) : deleteSourceTag(tagId);
    onChanged();
    if (count > 0) {
      toast.success(`Тег "${tagName}" удалён и отвязан от ${count} ${kind === "channel" ? "каналов" : "источников"}`);
    } else {
      toast.success(`Тег "${tagName}" удалён`);
    }
  };

  const handleRename = (tagId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    if (kind === "channel") {
      renameChannelTag(tagId, trimmed);
    } else {
      renameSourceTag(tagId, trimmed);
    }
    setEditingId(null);
    onChanged();
    toast.success("Тег переименован");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4" />
            Управление тегами {kind === "channel" ? "каналов" : "источников"}
          </DialogTitle>
          <DialogDescription>
            Создавайте, переименовывайте и удаляйте теги для группировки и фильтрации.
          </DialogDescription>
        </DialogHeader>

        {/* Add new tag */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`size-5 rounded-full ${TAG_DOT_COLORS[c]} transition-all ${
                  newColor === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : "hover:scale-110"
                }`}
              />
            ))}
          </div>
          <Input
            placeholder="Новый тег..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="size-3.5" />
          </Button>
        </div>

        {/* Tag list */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tags.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              Тегов пока нет
            </div>
          ) : (
            tags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 group"
              >
                {editingId === tag.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleRename(tag.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(tag.id)}
                      className="text-green-600 hover:text-green-700 p-0.5"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}
                      className="flex-1 text-left"
                    >
                      <TagBadge name={tag.name} color={tag.color} size="md" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

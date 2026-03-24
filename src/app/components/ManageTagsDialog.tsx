import { useState } from 'react'
import { Check, Plus, Tag, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TAG_DOT_COLORS, TagBadge } from './TagBadge'
import { TAG_COLORS, type ChannelTag, type SourceTag, type TagColor } from '../types/domain'
import * as channelService from '../services/channelService'
import * as sourceService from '../services/sourceService'

interface ManageTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  kind: 'channel' | 'source'
  tags: (ChannelTag | SourceTag)[]
  onChanged: () => void
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  teamId,
  kind,
  tags,
  onChanged,
}: ManageTagsDialogProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<TagColor>('blue')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      return
    }

    if (tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Тег с таким именем уже существует')
      return
    }

    try {
      setIsSubmitting(true)

      if (kind === 'channel') {
        await channelService.createChannelTag(teamId, trimmed, newColor)
      } else {
        await sourceService.createSourceTag(teamId, trimmed, newColor)
      }

      setNewName('')
      onChanged()
      toast.success(`Тег "${trimmed}" создан`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать тег')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (tagId: string, tagName: string) => {
    try {
      setIsSubmitting(true)

      if (kind === 'channel') {
        await channelService.deleteChannelTag(teamId, tagId)
      } else {
        await sourceService.deleteSourceTag(teamId, tagId)
      }

      onChanged()
      toast.success(`Тег "${tagName}" удалён`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить тег')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRename = async (tagId: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      return
    }

    if (tags.some((tag) => tag.id !== tagId && tag.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Тег с таким именем уже существует')
      return
    }

    try {
      setIsSubmitting(true)

      if (kind === 'channel') {
        await channelService.updateChannelTag(teamId, tagId, { name: trimmed })
      } else {
        await sourceService.updateSourceTag(teamId, tagId, { name: trimmed })
      }

      setEditingId(null)
      onChanged()
      toast.success('Тег переименован')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось переименовать тег')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4" />
            Управление тегами {kind === 'channel' ? 'каналов' : 'источников'}
          </DialogTitle>
          <DialogDescription>Создавайте, переименовывайте и удаляйте теги для группировки и фильтрации.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`size-5 rounded-full ${TAG_DOT_COLORS[color]} transition-all ${
                  newColor === color ? 'ring-2 ring-offset-1 ring-border scale-110' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
          <Input
            placeholder="Новый тег..."
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleAdd()}
            className="h-8 text-sm flex-1"
            disabled={isSubmitting}
          />
          <Button size="sm" className="h-8" onClick={() => void handleAdd()} disabled={!newName.trim() || isSubmitting}>
            <Plus className="size-3.5" />
          </Button>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tags.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Тегов пока нет</div>
          ) : (
            tags.map((tag) => (
              <div key={tag.id} className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                {editingId === tag.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void handleRename(tag.id)
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    <button onClick={() => void handleRename(tag.id)} className="text-green-600 hover:text-green-700 p-0.5">
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-0.5 text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(tag.id)
                        setEditingName(tag.name)
                      }}
                      className="flex-1 text-left"
                    >
                      <TagBadge name={tag.name} color={tag.color} size="md" />
                    </button>
                    <button
                      onClick={() => void handleDelete(tag.id, tag.name)}
                      className="p-0.5 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:text-red-500"
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
  )
}

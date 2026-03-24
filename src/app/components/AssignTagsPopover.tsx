import { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'

import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { TAG_DOT_COLORS } from './TagBadge'
import { TAG_COLORS, type ChannelTag, type SourceTag, type TagColor } from '../types/domain'
import * as channelService from '../services/channelService'
import * as sourceService from '../services/sourceService'

interface AssignTagsPopoverProps {
  entityId: string
  teamId: string
  kind: 'channel' | 'source'
  allTags: (ChannelTag | SourceTag)[]
  assignedTagIds: string[]
  onChanged: () => void
}

export function AssignTagsPopover({
  entityId,
  teamId,
  kind,
  allTags,
  assignedTagIds,
  onChanged,
}: AssignTagsPopoverProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<TagColor>('blue')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggle = async (tagId: string) => {
    try {
      setIsSubmitting(true)

      if (assignedTagIds.includes(tagId)) {
        if (kind === 'channel') {
          await channelService.removeChannelTagLink(entityId, tagId)
        } else {
          await sourceService.removeSourceTagLink(entityId, tagId)
        }
      } else if (kind === 'channel') {
        await channelService.assignChannelTag(entityId, tagId)
      } else {
        await sourceService.assignSourceTag(entityId, tagId)
      }

      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить теги')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreate = async () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      return
    }

    if (allTags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Тег с таким именем уже существует')
      return
    }

    try {
      setIsSubmitting(true)

      let tag: ChannelTag | SourceTag
      if (kind === 'channel') {
        tag = await channelService.createChannelTag(teamId, trimmed, newColor)
        await channelService.assignChannelTag(entityId, tag.id)
      } else {
        tag = await sourceService.createSourceTag(teamId, trimmed, newColor)
        await sourceService.assignSourceTag(entityId, tag.id)
      }

      setNewName('')
      setShowCreate(false)
      onChanged()
      toast.success(`Тег "${trimmed}" создан и присвоен`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать тег')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Tag className="size-3" />
          <Plus className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">Теги</p>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {allTags.length === 0 && !showCreate && <p className="px-2 py-2 text-xs text-muted-foreground">Тегов пока нет</p>}
          {allTags.map((tag) => {
            const checked = assignedTagIds.includes(tag.id)
            return (
              <label
                key={tag.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                  checked ? 'bg-primary/10' : 'hover:bg-muted/60'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => void toggle(tag.id)}
                  className="size-3.5"
                  disabled={isSubmitting}
                />
                <div className={`size-2 rounded-full ${TAG_DOT_COLORS[tag.color]}`} />
                <span className="truncate text-sm text-foreground">{tag.name}</span>
              </label>
            )
          })}
        </div>

        {showCreate ? (
          <div className="border-t mt-1.5 pt-2 space-y-2">
            <div className="flex gap-1 px-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`size-4 rounded-full ${TAG_DOT_COLORS[color]} transition-all ${
                    newColor === color ? 'ring-2 ring-offset-1 ring-border' : ''
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Имя тега..."
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void handleCreate()}
                className="h-7 text-xs flex-1"
                autoFocus
                disabled={isSubmitting}
              />
              <Button size="sm" className="h-7 text-xs px-2" onClick={() => void handleCreate()} disabled={!newName.trim() || isSubmitting}>
                OK
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t mt-1.5 pt-1.5">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-2 py-1 text-xs text-primary transition-colors hover:text-primary/80">
              <Plus className="size-3" />
              Создать тег
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

import { Image, Lock } from 'lucide-react'

interface MediaStatusHintProps {
  hasMedia?: boolean
  mediaPreviewAvailable?: boolean
  mediaPreviewRestrictedReason?: string | null
  className?: string
}

export function MediaStatusHint({
  hasMedia,
  mediaPreviewAvailable,
  mediaPreviewRestrictedReason,
  className = '',
}: MediaStatusHintProps) {
  if (!hasMedia) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`.trim()}>
        <Image className="size-3.5" />
        <span>Медиа нет</span>
      </div>
    )
  }

  if (mediaPreviewAvailable) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-emerald-600 ${className}`.trim()}>
        <Image className="size-3.5" />
        <span>Медиа есть</span>
      </div>
    )
  }

  return (
    <div className={`space-y-1 text-xs text-amber-700 ${className}`.trim()}>
      <div className="inline-flex items-center gap-1.5">
        <Lock className="size-3.5" />
        <span>Медиа есть, превью скрыто</span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {mediaPreviewRestrictedReason === 'telegram_source_media_not_stored'
          ? 'Telegram source: вложение не хранится постоянно, будет запрошено только в момент публикации.'
          : 'Превью недоступно из-за ограничений источника.'}
      </div>
    </div>
  )
}

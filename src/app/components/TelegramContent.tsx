import type { TelegramContentFormat } from '../types/domain'
import { cn } from './ui/utils'

interface TelegramContentProps {
  content: string
  format?: TelegramContentFormat
  className?: string
  emptyText?: string
}

export function telegramContentToPlainText(content: string, format: TelegramContentFormat = 'plain') {
  const normalized = format === 'telegram_html' ? content.replace(/<[^>]+>/g, ' ') : content
  return normalized.replace(/\s+/g, ' ').trim()
}

export function TelegramContent({
  content,
  format = 'plain',
  className,
  emptyText = 'Без текста',
}: TelegramContentProps) {
  if (!content.trim()) {
    return <p className={cn('text-sm text-gray-700 dark:text-gray-200', className)}>{emptyText}</p>
  }

  if (format === 'telegram_html') {
    return (
      <div
        className={cn(
          'whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 [&_a]:font-medium [&_a]:text-sky-600 [&_a]:underline [&_a]:decoration-sky-500/60 [&_a]:underline-offset-2 [&_a:hover]:text-sky-500 [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[0.9em] dark:text-gray-200 dark:[&_a]:text-sky-400 dark:[&_a]:decoration-sky-400/60 dark:[&_a:hover]:text-sky-300 dark:[&_code]:bg-gray-800/80 dark:[&_pre]:bg-gray-800/80',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200', className)}>{content}</p>
}

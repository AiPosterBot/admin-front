// ══════════════════════════════════════════════════════════════════════
//  Централизованные Zod-схемы валидации форм (Zod v4).
//  Одна схема = один источник правды для клиентской и серверной
//  валидации (при переходе на backend).
// ══════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// ── Примитивы ────────────────────────────────────────────────────────

/** HTTP/HTTPS URL — refine через new URL() для точной проверки протокола */
const httpUrl = z
  .string()
  .min(1, 'URL не может быть пустым')
  .refine(
    (val) => {
      try {
        const u = new URL(val);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Введите корректный URL (https://...)' },
  );

/**
 * Telegram username/URL → очищенный username.
 * transform делает: strips t.me/, @, query params — результат чистый username.
 */
const telegramUsername = z
  .string()
  .min(1, 'Укажите имя канала или ссылку')
  .transform((val) => {
    let u = val.trim();
    for (const prefix of ['https://t.me/', 'http://t.me/', 't.me/']) {
      if (u.startsWith(prefix)) u = u.slice(prefix.length);
    }
    if (u.startsWith('@')) u = u.slice(1);
    return u.split('/')[0].split('?')[0];
  })
  .refine((u) => u.length >= 3, {
    message: 'Слишком короткое имя канала. Минимум 3 символа.',
  })
  .refine((u) => /^[a-zA-Z][a-zA-Z0-9_]{2,30}$/.test(u), {
    message: 'Некорректное имя канала. Допустимы латинские буквы, цифры и _ (начинается с буквы).',
  });

// ── Source forms ──────────────────────────────────────────────────────

/** Форма добавления RSS-источника */
export const rssSourceSchema = z.object({
  url: httpUrl,
  name: z.string().optional(),
});
export type RssSourceForm = z.infer<typeof rssSourceSchema>;

/** Форма добавления Telegram-источника */
export const telegramSourceSchema = z.object({
  username: telegramUsername,
  name: z.string().optional(),
});
export type TelegramSourceForm = z.infer<typeof telegramSourceSchema>;

/** Форма добавления Website-источника */
export const websiteSourceSchema = z.object({
  url: httpUrl,
  name: z
    .string()
    .min(2, 'Название должно содержать минимум 2 символа')
    .max(80, 'Название слишком длинное'),
});
export type WebsiteSourceForm = z.infer<typeof websiteSourceSchema>;

// ── Channel forms ─────────────────────────────────────────────────────

export const channelSchema = z.object({
  name: z
    .string()
    .min(2, 'Название канала слишком короткое')
    .max(80, 'Название канала слишком длинное'),
  telegramTarget: z
    .string()
    .min(1, 'Укажите Telegram ID или username')
    .regex(/^-?\d+$|^@[a-zA-Z][a-zA-Z0-9_]{2,}$/, {
      message: 'Введите числовой ID или @username',
    }),
});
export type ChannelForm = z.infer<typeof channelSchema>;

// ── Member invitation form (Zod v4: z.email() вместо .email()) ─────────

export const inviteSchema = z.object({
  // Zod v4: используем z.string().check() или inline refine для email
  email: z
    .string()
    .min(1, 'Укажите email')
    .refine(
      (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: 'Некорректный формат email' },
    ),
});
export type InviteForm = z.infer<typeof inviteSchema>;

// ── Admin form ────────────────────────────────────────────────────────

export const adminSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Никнейм минимум 3 символа')
    .max(30, 'Никнейм слишком длинный')
    .regex(/^[a-zA-Z0-9_]+$/, 'Допустимы латинские буквы, цифры и _'),
  password: z
    .string()
    .min(6, 'Пароль минимум 6 символов'),
});
export type AdminForm = z.infer<typeof adminSchema>;

// ── ZodError compat (Zod v4) ──────────────────────────────────────────

/** Тип ошибок от safeParse — совместим с Zod v3 и v4 */
export type ValidationErrors = z.ZodError;

// ?? ???????: ?????????? `parse` ??? throw ?????????????????????????

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; errors: ValidationErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error };
}

/** Возвращает первую ошибку для поля (для ручной интеграции без RHF) */
export function firstError(
  error: ValidationErrors | undefined,
  field: string,
): string | undefined {
  // Zod v4: основное поле .issues, для совместимости также проверяем .errors
  return (error?.issues ?? (error as any)?.errors)
    ?.find((e: { path: (string | number)[] }) => e.path[0] === field)?.message;
}

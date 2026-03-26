# AI Poster — Архитектура проекта

Этот документ описывает все сущности системы, их связи, роли пользователей и общую логику работы платформы.

---

## 1. Общая идея

AI Poster — это платформа для автоматической публикации контента в Telegram-каналы с использованием LLM. Система:

1. **Собирает контент** из внешних источников (RSS-ленты, Telegram-каналы, веб-сайты)
2. **Обрабатывает** его через LLM (переписывает, адаптирует под стиль канала)
3. **Публикует** готовые посты в Telegram-каналы по расписанию или мгновенно
4. **Рассылает рекламу** через Telegram-бота (`/ads`) по выбранным каналам

Всё управляется через веб-админку, организованную по командам.

---

## 2. Сущности и их связи

### 2.1. Схема связей

```
                         ┌──────────────────┐
                         │   Admin (root)   │  Глобальное управление
                         └────────┬─────────┘
                                  │ управляет
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────────┐
              │  Users   │ │  Teams   │ │ AdminInvites │
              └────┬─────┘ └────┬─────┘ └──────────────┘
                   │            │
                   └──────┬─────┘
                          ▼
                   ┌─────────────┐
                   │ TeamMember  │  owner / member
                   └──────┬──────┘
                          │ принадлежит команде
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ Channel  │ │  Source  │ │  Invitation  │
        └───────┘ └────┬─────┘ └──────────────┘
             │            │
             │    ┌───────┘
             │    ▼
             │  ┌──────┐
             │  │ Item │  (сырой контент)
             │  └──┬───┘
             │     │
             └──┬──┘
                ▼
           ┌─────────┐
           │   Job   │  (fetch / publish / onboard)
           └────┬────┘
                │
          ┌─────┼─────┐
          ▼           ▼
    ┌──────────┐ ┌──────────┐
    │ LLMTrace │ │PostedItem│
    └──────────┘ └──────────┘
```

### 2.2. Детали каждой сущности

#### Admin (Глобальный администратор)
```typescript
{
  id, nickname, password, isRoot, isActive, createdAt, lastActive
}
```
- **Отдельная сущность** — не пользователь, не состоит в командах
- Авторизация по **нику + пароль** на `/admin/login`
- `root`-админ неудаляемый и неотключаемый — создаётся при старте систмы
- Может создавать других админов, управлять всеми пользователями и командами
- Видит глобальную LLM-аналитику (расходы, токены, модели)
- Рассылает **AdminInvite** — приглашения на платформу (дают право создавать команды)

#### User (Пользователь)
```typescript
{
  id, email, displayName, password,
  isActive, emailVerified,
  canCreateTeam, maxTeams,
  telegramUsername?, telegramLinkedAt?,
  createdAt, lastActive
}
```
- Авторизация по **email + пароль** на `/login`
- `canCreateTeam` — флаг, разрешающий создание команд (выдаётся через AdminInvite)
- `maxTeams` — максимальное количество команд, которые может создать
- Может состоять в нескольких командах одновременно с разными ролями
- Профиль: имя, email, таймзона (24 зоны), привязка Telegram
- `telegramUsername` — привязанный TG-аккаунт (без @), необходим для создания рекламных постов

#### Team (Команда)
```typescript
{
  id, name, ownerId, ownerName,
  isActive, channelsCount, sourcesCount, membersCount,
  limits: { maxPostsPerDay, maxChannels, maxSources, maxAgentRuns, maxMembers },
  createdAt
}
```
- **Центральная сущность** — всё привязано к команде
- `teamId` хранится в `TeamContext` (localStorage), не в URL
- Переключение через дропдаун в шапке, весь интерфейс перестраивается
- Лимиты (порядок отображения):
  1. Постов в день (100)
  2. Запуски агента парсера (20)
  3. Источников (20)
  4. Каналов (10)
  5. Участников
- Удаление возможно только если: 0 каналов, 0 источников, 1 участник (владелец)

#### TeamMember (Участник команды)
```typescript
{
  id, userId, userName, userEmail,
  teamId, role: 'owner' | 'member',
  isActive, createdAt
}
```
- Связь many-to-many между User и Team
- Две роли:
  - **owner** — полные права: управление каналами, источниками, участниками, настройками, удаление команды
  - **member** — просмотр данных, ограниченные действия
- Owner приглашает участников по email (Invitation)
- Pending-ивайты занимают слот в лимите участников

#### Invitation (Приглашение в команду)
```typescript
{
  id, teamId, email,
  invitedByUserId, invitedByName,
  status: 'pending' | 'accepted' | 'cancelled',
  inviteToken, createdAt, acceptedAt?
}
```
- Owner отправляет приглашение → генерируется `inviteToken`
- Приглашённый переходит по `/invite/:token`
- Если уже зарегистрирован — логинится и принимает
- Если не зарегистрирован — регистрируется, затем принимает
- Может быть отменено owner'ом

#### AdminInvite (Приглашение на платформу)
```typescript
{
  id, email, invitedByAdminId,
  inviteToken, status: 'pending' | 'accepted',
  createdAt
}
```
- Глобальный админ приглашает нового пользователя на платформу
- При регистрации с токеном AdminInvite → `canCreateTeam = true`
- Отдельный флоу от командных приглашений

---

## 3. Каналы публикации

#### Channel (Канал)
```typescript
{
  id, teamId, name, telegramId,
  isActive, botCanPost,
  publishMode: 'instant' | 'scheduled',
  cron?, timezone?,
  contentStrategy?,
  postStyle?,
  agentInstructions?,
  linkedSourcesCount,
  subscribersCount,
  lastPublishedAt?, lastError?,
  createdAt
}
```

**Что это**: Telegram-канал, куда бот публикует обработанный контент.

**Подписчики**: `subscribersCount` — текущее количество подписчиков канала. Отображается в шапке страницы канала и в карточке «Публикации» на вкладке «Обзор».

**Режимы публикации**:
- `instant` — пост публикуется сразу после генерации
- `scheduled` — по cron-расписанию (настраивается через `SchedulePicker`), с указанием таймзоны

**Стиль постов** (`postStyle`):
Единственное пользовательское поле для настройки стиля генерации. Бэкенд подставляет его в большой системный промпт, который уже содержит базовые инструкции (переписывать, сохраняя смысл и факты). Пользователь указывает только стилистику: тон, формат, аудиторию, язык, хэштеги, эмодзи и т.д.

**Инструкции для агента** (`agentInstructions`):
Появляется только при выборе стратегии «На выбор агента» в режиме публикации «По расписанию». Объясняет агенту, по какому принципу выбирать материал для публикации (например: «выбирай самый интересный», «приоритет — эксклюзивы»).

**Привязка к источникам**: Channel ↔ Source — связь many-to-many через `ChannelSourceLink`. Один канал может получать контент из нескольких источников, один источник может поставлять контент в несколько каналов.

**Статусы**:
- `isActive` — канал включён/выключен
- `botCanPost` — бот имеет права на постинг в канале
- `lastError` — текст последней ошибки (напр., «Бот удалён из канала»)

---

## 4. Источники контента

#### Source (Источник)
```typescript
{
  id, teamId, name,
  type: 'telegram' | 'rss' | 'website',
  isActive, url,
  status: 'ok' | 'error',
  lastError?, lastFetchedAt?,
  itemsCount, itemsCount24h, itemsCountWeek, itemsCountMonth,
  createdAt
}
```

**Три типа источников**:

| Тип | Описание | Пример URL | Job-тип |
|-----|----------|-----------|---------|
| `rss` | RSS/Atom лента | `https://techcrunch.com/feed` | `fetch_rss` |
| `telegram` | Публичный TG-канал | `t.me/ai_news_official` | `fetch_telegram` |
| `website` | Веб-сайт (парсинг агентом) | `https://news.ycombinator.com` | `fetch_website` + `onboard_website` |

**Добавление истоника** — мультишаговый диалог (`AddSourceDialog.tsx`):
1. Выбор типа (RSS / Telegram / Website)
2. Ввод URL / username / адреса сайта + название
3. Проверка с симуляцией (~2 сек): валидация формата, проверка дубликатов, проверка лимитов, симуляция ошибок (404, приватный канал, таймаут)
4. Превью: информация о фиде/канале + раскрываемые sample-записи с полным контентом → подтверждение

**Website-флоу через AI-агента** (отдельный путь в `AddSourceDialog.tsx`):
1. Выбор типа Website → ввод URL + название
2. Живая анимация работы агента с 5 этапами, прогресс-баром и раскрывающимися логами в терминальном стиле
3. По завершении — превью результата с примерами статей (`WebsiteArticleCard`) и кнопкой «Принять и включить»
4. Обработка ошибок агента с возможностью повторного запуска

**Компонент `WebsiteArticleCard`** (внутри `AddSourceDialog.tsx`):
- Миниатюра изображеня, счётчик символов, бейдж «фото»
- Кликабельная ссылка «источник» рядом с датой
- Раскрывающийся полный текст с большим изображением

**Счётчики**: `itemsCount` / `itemsCount24h` / `itemsCountWeek` / `itemsCountMonth` — сколько контент-элементов собрано из этого источника.

---

## 5. Контент-элементы

#### Item (Сырой контент)
```typescript
{
  id, teamId, sourceId, sourceName,
  title, content, mediaUrl?,
  extractedAt
}
```

**Что это**: единица сырого контента, извлечённая из источника. Это «сырьё», из которого LLM потом генерирует пост.

- Привязан к конкретному `Source`
- Содержит оригинальный текст, заголовок и (опционально) медиа
- Может быть опубликован в несколько каналов (каждая публикация — отдельный `PostedItem`)
- Может быть неопубликованным (просто собранный контент)

---

## 6. Опубликованные посты

#### PostedItem (Пост)
```typescript
{
  id, teamId,
  channelId, channelName,
  itemId, itemTitle,
  sourceId, sourceName,
  jobId,
  generatedContent,
  mediaUrl?,
  postedAt,
  status: 'success' | 'failed',
  llmTraceId?,
  telegramMessageId?,
  views?, reactions?
}
```

**Что это**: результат публикации — сгенерированный LLM контент, отправленный в Telegram-канал.

**Медиа**: `mediaUrl` — если исходный Item содержал изображение (`mediaUrl`), оно копируется в PostedItem и отображается вместе с текстом поста на всех страницах (список постов, детали поста, история публикаций канала, публикации источника, связанный пост задачи, публикации контент-элемента).

**Связи** (каждый пост ссылается на):
- `Channel` — в какой канал опубликовано
- `Item` — из какого контент-элемента сгенерировано
- `Source` — из какого источника пришёл оригинал
- `Job` — какая задача выполнила публикацию
- `LLMTrace` — трейс вызова LLM при генерации

**Статусы**:
- `success` — пост успешно отправлен в Telegram (есть `telegramMessageId`)
- `failed` — ошибка при отправке (views/reactions = 0)

---

## 7. Задачи (Jobs)

#### Job (Задача)
```typescript
{
  id, teamId,
  type: string,
  status: 'pending' | 'running' | 'success' | 'failed',
  progress: number,
  params, result?, error?,
  logs: string[],
  createdAt, completedAt?,
  llmTraceIds: string[]
}
```

**Типы задач**:

| Тип | Что делает | Результат |
|-----|-----------|-----------|
| `fetch_rss` | Загружает RSS-ленту, сохраняет новые Item'ы | `{ newItemsCount, totalFetched }` |
| `fetch_rss_hybrid` | Загружает RSS-ленту + доскрейпивает полный текст статей через HTML | `{ newItemsCount, totalFetched }` |
| `fetch_telegram` | Парсит сообщения из TG-канала | `{ newItemsCount }` |
| `fetch_website` | Скрейпит страницы сайта | `{ newItemsCount, pagesScanned }` |
| `onboard_website` | Анализирует структуру сайта для настройки CSS-парсера (AI-агент) | `{ itemsFound, structureDetected }` |
| `onboard_rss_article` | Анализирует структуру RSS-статей для настройки article-парсера (AI-агент) | `{ itemsFound, configDetected }` |
| `publish_to_channel` | Генерирует контент через LLM и публикует в канал | `{ messageId, publishedAt }` |
| `ads_campaign` | Рассылка рекламного поста по каналам кампании | `{ sentCount, failedCount }` |

**Статусы**:
- `pending` — в очереди, ожидает планировщик
- `running` — выполняется (синий бейдж «Выполняется»; прогресс-бар отсутствует)
- `success` — завершена успешно
- `failed` — ошибка (текст в `error`)

**Логи**: массив строк `logs[]` — пошаговый журнал выполнения задачи с таймстемпами.

**Фильтры на странице задач**: только дропдауны (тип, период, канал, источник) + общая кнопка сброса. Без фильтра-переключателя по статусам.

---

## 8. LLM-трейсы

#### LLMTrace (Трейс вызова LLM)
```typescript
{
  id, jobId?,
  model,
  promptTokens, completionTokens, totalTokens,
  cost, latencyMs,
  prompt, response,
  toolCalls?,
  rawRequest, rawResponse,
  createdAt
}
```

**Что это**: запись каждого вызова LLM-модели. Полная трассировка: что отправили, что получили, сколько стоило.

**Содержит**:
- Модель (`gpt-4-turbo`, `gpt-4o`)
- Токены (prompt / completion / total)
- Стоимость в долларах
- Задержка (latencyMs)
- Полный промпт и ответ
- Tool calls (если были)
- Сырые request/response JSON

**Связи**:
- Привязан к `Job` (но может быть и без привязки)
- Одна задача может иметь несколько трейсов

---

## 9. Рекламные посты и кампании

### 9.1. AdsPost (Рекламный пост)
```typescript
{
  id, teamId,
  createdByUserId, createdByName,
  text: string,        // текст сообщения (как в TG — с форматированием)
  mediaUrl?: string,   // фото/видео
  usedInCampaigns: string[], // ids ампаний
  createdAt
}
```

**Что это**: контент для рекламной рассылки, захваченный через Telegram-бота.

**Флоу создания** (через бота `@ai_poster_bot`):
1. Пользователь отправляет боту любое сообщение (текст, фото, видео, форматирование)
2. Отвечает на это сообщение командой `/ads`
3. Бот предлагает выбрать команду, в которую сохранить пост
4. Пост сохраняется и появляется в админке на странице `/ads/posts`

**Требования**:
- Для создания постов пользователь должен привязать Telegram-аккаунт (Профиль → Привязка Telegram)
- Нельзя редактировать после создания
- Нельзя удалить, если используется в кампании (`usedInCampaigns.length > 0`)
- Один пост может использоваться в нескольких кампаниях

### 9.2. AdsCampaign (Кампания)
```typescript
{
  id, name,
  status: 'ready' | 'sending' | 'completed',
  scheduledAt?,
  adsPostId: string, // ссылка на AdsPost
  targetChannels: string[],
  channelResults?: Record<string, {
    status: 'sent' | 'failed' | 'pending',
    telegramMessageId?: number,
    viewsCount?: number,
    error?: string,
  }>,
  sentCount, failedCount,
  createdAt
}
```

**Что это**: массовая рассылка выбранного рекламного поста по нескольким каналам.

**Жизненный цикл**: `ready` → `sending` → `completed`

Кампания создается сразу в статусе `ready` (пост уже выбран). Кампанию в статусе `ready` можно отменить (удалить) — через AlertDialog с подтверждением. При удалении ссылка на кампанию убирается из `usedInCampaigns` поста. Статус `completed` означает завершение рассылки — при этом отдельные каналы могут иметь ошибки (`channelResults[ch].status === 'failed'`), что отражается в `failedCount`.

**Создание кампании** — 4 шага:
1. Название кампании
2. Выбор поста из списка AdsPost (с пагинацией)
3. Выбор каналов (с пагинацией, чекбоксы, «выбрать вс»)
4. Расписание — «отправить сразу» или дата+время (в таймзоне пользователя)

**channelResults**: для каждого канала хранится результат отправки с `telegramMessageId` (ссылка на конкретное сообщение в формате `https://t.me/channel/messageId`).

**Список кампаний** (`AdsCampaignsPage`):
- Фильтры-переключатели: Все / Запланированы / Отправка / Завершены (с каунтерами)
- Колонка «Каналы»: плашки `@channel` (макс. 2 видимых + `+N`), кликабельные — открывают t.me/
- Колонка «Просмотры»: суммарные просмотры по всем каналам (из `channelResults[ch].viewsCount`), по центру
- Колонка «Отправлено / Ошибки / Всего»: числа по центру, tabular-nums
- При рассылке создаётся задача (Job) типа `ads_campaign`

**Детали кампании** (`AdsCampaignDetailPage`):
- Статистика: каналов / просмотры / отправлено / ошибки / успешность
- Карточка суммарных просмотров с иконкой Eye
- Рекламный пост с медиа и текстом
- Таблица целевых каналов с колонкой «Просмотры» (по центру), результатами отправки и ссылками на конкретные сообщения в TG

### 9.3. Привязка Telegram в профиле

```typescript
User {
  ...
  telegramUsername?: string,  // без @
  telegramLinkedAt?: string,
}
```

Привязка через deep link: `https://t.me/ai_poster_bot?start=link_account_USERID`. Дотупна через:
- Кнопка «Открыть бота в Telegram» (открывает новую вкладку)
- QR-код с той же ссылкой

---

## 10. Связь Channel ↔ Source

```typescript
interface ChannelSourceLink {
  channelId: string;
  sourceId: string;
}
```

Связь many-to-many: один канал получает контент из нескольких источников, один источник может поставлять контент в несколько каналов.

Функции:
- `linkSource(channelId, sourceId)` — привязать
- `unlinkSource(channelId, sourceId)` — отвязать

Отображается на странице деталей канала: список привязанных источников с возможностью добавления/удаления.

---

## 10.1. Теги каналов и источников

Две отдельные системы тегов: `ChannelTag` для каналов и `SourceTag` для источников. Связь many-to-many через link-таблицы.

#### ChannelTag / SourceTag
```typescript
{
  id, teamId, name, color: TagColor, createdAt
}
```

#### ChannelTagLink / SourceTagLink
```typescript
// ChannelTagLink
{ channelId: string; tagId: string; }

// SourceTagLink
{ sourceId: string; tagId: string; }
```

**Палитра цветов** (`TagColor`): 8 фиксированных вариантов — `red`, `blue`, `green`, `amber`, `purple`, `pink`, `teal`, `orange`.

**Компоненты**:

| Компонент | Файл | Назначение |
|-----------|------|------------|
| `TagBadge` | `components/TagBadge.tsx` | Цветной бейдж тега (8 цветов), опциональная кнопка удаления, два размера (sm/md) |
| `TagFilter` | `components/TagFilter.tsx` | Popover-фильтр с чекбоксами, мультиселект с OR-логикой, кнопка «Сбросить» |
| `ManageTagsDialog` | `components/ManageTagsDialog.tsx` | CRUD-диалог тегов: создание с палитрой, inline-переименование, удаление с отвязкой |
| `AssignTagsPopover` | `components/AssignTagsPopover.tsx` | Назначение тегов сущности через чекбоксы + inline-создание нового тега |

**Места интеграции**:

| Место | Тип тегов | Что показывается |
|-------|-----------|------------------|
| `TeamChannelsPage` | channel | `TagFilter` + бейджи в таблице + `AssignTagsPopover` в строках + кнопка управления тегами |
| `TeamSourcesPage` | source | `TagFilter` + бейджи в таблице + `AssignTagsPopover` в строках + кнопка управления тегами |
| `ChannelDetailPage` (шапка) | channel | Бейджи тегов + `AssignTagsPopover` |
| `ChannelDetailPage` (диалог привязки источника) | source | `TagFilter` для фильтрации источников |
| `SourceDetailPage` (шапка) | source | Бейджи тегов + `AssignTagsPopover` |
| `AddCampaignDialog` (шаг «Каналы») | channel | `TagFilter` + бейджи у каналов |
| `PostsPage` | channel + source | Два `TagFilter`: «Теги каналов» и «Теги источников» |
| `ItemsPage` | source | `TagFilter` «Теги источников» |
| `DashboardPage` | channel + source | Бейджи тегов в top-5 списках каналов и источников |

**Фильтрация**: OR-логика — показываются сущности, имеющие хотя бы один из выбранных тегов.

**Удаление тега**: при удалении через `ManageTagsDialog` тег автоматически отвязывается от всех сущностей, пользователь видит toast с количеством затронутых сущностей.

**Функции mock-data**:
- `getChannelTags(channelId)` / `getSourceTags(sourceId)` — получить теги сущности
- `assignChannelTag` / `removeChannelTagLink` — привязать/отвязать тег канала
- `assignSourceTag` / `removeSourceTagLink` — привязать/отвязать тег источника
- `addChannelTag` / `addSourceTag` — создать тег
- `deleteChannelTag` / `deleteSourceTag` — удалить тег (с отвязкой)
- `renameChannelTag` / `renameSourceTag` — переименовать тег

---

## 11. Полный цикл работы системы

```
1. СБОР КОНТЕНТА
   Source (RSS / TG / Website)
     → Job (fetch_rss / fetch_telegram / fetch_website)
       → Item (сырой контент сохраняется)

2. ГЕНЕРАЦИЯ И ПУБЛИКАЦИЯ
   Item + Channel (с промптами)
     → Job (publish_to_channel)
       → LLM вызов (генерация текста) → LLMTrace
         → PostedItem (отправка в Telegram)

3. МОНИТОРИНГ
   Admin Dashboard — глобальная статистика
   Team Dashboard — статистика команды
   LLM Analytics — расходы и использование моделей
   Jobs — журнал всех задач с логами
```

### Пример полного цикла одного поста:

1. **Source** `TechCrunch` (RSS, `src1`) настроен в команде `Tech News Team`
2. **Job** `fetch_rss` (`job17`) загружает ленту → находит 5 новых статей
3. **Item** `item1` — «OpenAI announces GPT-5...» — сохраняется
4. **Channel** `Tech Daily` (`ch1`) привязан к `src1` через `ChannelSourceLink`
5. **Job** `publish_to_channel` (`job1`) запускается:
   - Берёт `item1` и `postStyle` канала (подставляется в системный промпт)
   - Вызывает LLM (`gpt-4-turbo`)  **LLMTrace** `llm1` (1630 токенов, $0.0245)
   - Получает переработанный текст с эмодзи и хэштегами
6. **PostedItem** `pi1` — пост отправляется в `@tech_daily_news` → Telegram Message ID 1042
7. Статистика: 150 просмотров, 20 реакций

---

## 12. Авторизация и контексты

### AuthContext
```typescript
{
  authType: 'admin' | 'user',
  currentUser: User | null,
  currentAdmin: Admin | null,
  isLoggedIn: boolean,
  isAdminLoggedIn: boolean,
  refresh(): void
}
```

Два полностью раздельных потока:
- **User**: email + пароль → `/login` → `localStorage: currentUserId, isLoggedIn`
- **Admin**: ник + пароль → `/admin/login` → `localStorage: currentAdminId, isAdminLoggedIn`

### TeamContext
```typescript
{
  currentTeamId: string | null,
  setCurrentTeamId(id): void,
  hasTeams: boolean,
  refreshTeams(): void
}
```

- `currentTeamId` не в URL — хранится в `localStorage`
- При входе: загружаются все команды пользователя, выбирается сохранённая или первая
- Переключение через дропдаун в шапке → весь интерфейс перестраивается
- Если команд нет → редирект на `/onboarding`

---

## 13. Лейауты

### RootLayout (пользовательский)
- **Шапка**: логотип AI Poster, дропдаун команд, аватар + меню (профиль, выход)
- **Сайдбар** (три группы, разделены `border-gray-100` с `my-2`):
  1. Обзор, Каналы, Источники, Кампании
  2. Публикации, Контент, Задачи, LLM Трейсы
  3. Участники, Настройки
- **Toaster** из `sonner` — глобальный, все уведомления через `toast()`

### AdminLayout
- Отдельный сайдбар для `/admin/*`:
  - Дашборд, Пользователи, Команды, Администраторы, Приглашения, LLM-аналитка
- Не привязан к TeamContext

---

## 14. Ключевые UI-компоненты

| Компонент | Файл | Назначение |
|-----------|------|-----------|
| `AddSourceDialog` | `components/AddSourceDialog.tsx` | Мультишаговый диалог добавления источников (RSS/Telegram/Website с AI-агентом) |
| `WebsiteArticleCard` | внутри `AddSourceDialog.tsx` | Карточка статьи сайта: миниатюра, счётчик символов, бейдж «фото», раскрывющийся текст |
| `AddChannelDialog` | `components/AddChannelDialog.tsx` | Диалог добавления Telegram-канала |
| `AddCampaignDialog` | `components/AddCampaignDialog.tsx` | 4-шаговый диалог создания кампании (название → пост → каналы → расписание) |
| `AgentArticleCard` | внутри `SourceDetailPage.tsx` | Карточка-превью статьи при diff-сравнении конфига агента |
| `TagBadge` | `components/TagBadge.tsx` | Цветной бейдж тега (8 цветов), опциональная кнопка удаления, два размера (sm/md) |
| `TagFilter` | `components/TagFilter.tsx` | Popover-фильтр с чекбоксами, мультиселект с OR-логикой, кнопка «Сбросить» |
| `ManageTagsDialog` | `components/ManageTagsDialog.tsx` | CRUD-диалог тегов: создание с палитрой, inline-переименование, удаление с отвязкой |
| `AssignTagsPopover` | `components/AssignTagsPopover.tsx` | Назначение тегов сущности через чекбоксы + inline-создание нового тега |
| `PeriodPicker` | `components/PeriodPicker.tsx` | Выбор периода: пресеты (сегодня/неделя/месяц) + сброс |
| `SchedulePicker` | `components/SchedulePicker.tsx` | Визуальный выбор cron-расписания |
| `TeamLimitsCard` | `components/TeamLimitsCard.tsx` | Прогресс-бары лимитов команды |
| `Pagination` | `components/Pagination.tsx` | Пагинация с выбором размера страницы |
| `UserAvatar` | `components/UserAvatar.tsx` | Аватар с инициалами из имени |

---

## 15. Mock-данные: что есть

| Сущность | Количество | Примеры |
|----------|-----------|---------|
| Админы | 2 | `root` (неудаляемый), `admin` |
| Пользователи | 5 | John Doe (owner 2 команд), Jane Smith, Alex Petrov, Maria Ivanova, Disabled User |
| Команды | 3 | Tech News Team, Marketing Hub, Crypto Analytics (неактивна) |
| Каналы | 4 | Tech Daily (scheduled), AI Updates (instant), Web3 Corner (отключён, ошибка), Marketing Pro |
| Источники | 10 | 9 в team1 + 1 в team2. Типы и статусы: TechCrunch (RSS, ok), Hacker News (website, ok), AI News Channel (TG `@ai_newschannel`, ok), OpenAI Blog (RSS, error), Технозавр (TG `@tehnozavr`, error — нет прав бота), Habr (website, ok), Cyber Security News (TG `@cybersecnews`, ok), The Verge (RSS, ok), ArsTechnica (website, остановлен — `isActive: false`), Marketing Week (RSS, ok, team2) |
| Items | 22+ | Реальные заголовки tech-новостей |
| Посты | 21 | С генерированным контентом на русском/английском |
| Задачи | 31 | fetch_rss, fetch_telegram, fetch_website, onboard_website, publish_to_channel, ads_campaign |
| LLM-трейсы | 8 | gpt-4-turbo и gpt-4o, с полными prompt/response |
| Рекламные посты | 18 | 17 в team1, 1 в team2; с медиа и без; часть используется в нескольких кампаниях |
| Кампании | 11 | completed, ready, sending; некоторые посты используются в нескольких кампаниях |
| Теги каналов | 4 | По 4 тега в team1 с предустановленными привязками к каналам |
| Теги источников | 4 | По 4 тега в team1 с предустановленными привязками к источникам |
| Инвайты | 3 командных + 1 админский | |

---

## 16. Стек технологий

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| React | 18.3.1 | UI-фреймворк |
| TypeScript | — | Типизация |
| React Router | 7.13.0 | Маршрутизация (Data Mode, `createBrowserRouter`) |
| Tailwind CSS | 4.1.12 | Утилиарные стили |
| Radix UI / shadcn | — | Доступные UI-компоненты |
| Lucide React | 0.487.0 | Иконки |
| Sonner | 2.0.3 | Toast-уведомления |
| Recharts | 2.15.2 | Графики (админ-аналитика) |
| Motion | 12.23.24 | Анимации |
| date-fns | 3.6.0 | Работа с датами |
| Vite | 6.3.5 | Сборщик |

---

## 17. UX-детали страниц

### SourceDetailPage (`pages/SourceDetailPage.tsx`)

**Общие элементы**:
- URL-плашка под названием источника — кликабельная ссылка (TG → `t.me/`, веб/RSS → URL напрямую), синяя с hover-эффектом
- Кнопка «Остановить» — amber-цвет с inline-подтверждением (не модалка)
- Баннер остановки — amber-стилизация с кнопкой «Включить» (зелёная, иконка Play)
- Три summary-карточки: «Материалов собрано» (сегодня/неделя/месяц/всего), «Публикаций из источника», «Информация» (привязанные каналы)
- «Зона риска» с удалением через inline-подтверждение — доступна для всех типов

**4 вкладки**:
1. **Контент** — лента собранных Item'ов с фильтрами и пагинацией
2. **Публикации** — посты, созданные из материалов этого источника
3. **Задачи** — связанные Job'ы
4. **Настройка** — конфигурация, зависящая от типа (см. ниже)

**Вкладка «Настройка»** (зависит от типа):
- **RSS**: конфиг ленты — 6 полей (`feedUrl`, `format`, `encoding`, `pollingInterval`, `maxItems`, `stripHtml`)
- **Website**: текущий конфиг CSS-селекторов (6 полей: `listSelector`, `articleSelector`, `titleSelector`, `contentSelector`, `dateSelector`, `imageSelector`), кнопка перезапуска агента, diff-сравнение нового/старого конфига с карточками-превью статей (`AgentArticleCard`)
- **Telegram**: только карточка проверки прав (при `status: 'error'`) + зона риска с удалением. Блок «Параметры подключения» убран как избыточный

### ChannelDetailPage (`pages/ChannelDetailPage.tsx`)

**5 вкладок**:
1. **Обзор** — стиль постов, расписание, статистика, количество подписчиков
2. **История публикаций** — список опубликованных постов канала
3. **Источники** — привязанные источники (many-to-many через `ChannelSourceLink`), кнопки привязки/отвязки
4. **Настройки** — стиль постов, политика публикации (instant/scheduled + стратегия выбора контента с инструкциями для агента), зона риска, удаление канала. Сохранение через sticky-бар с анимацией: появляется при наличии несохранённых изменений, содержит пульсирующий индикатор, кнопки «Сбросить» и «Сохранить» с лоадером. Dirty-detection сравнивает текущие значения с `useRef`-снапшотом начальных
5. **Тестирование** — тестовая генерация постов с текущим стилем

**Тестовая генерация** (вкладка «Тестирование»):
- Inline-список Item'ов из привязанных источников (до 20 шт.), с превью, счётчиком символов и бейджем источника
- Кнопка «Сгенерировать пост» открывает модалку с 2 шагами:
  1. **Генерация** — прогресс-бар с пошаговыми логами в терминальном стиле (загрузка материала → применение стиля → генерация через LLM → финализация)
  2. **Результат** — карточки LLM-статистики (модель, токены, стоимость), исходный материал, раскрывающийся сгенерированный пост; кнопка «Новый тест»
- Пост НЕ публикуется в канал — только превью

**UX-детали**:
- В шапке страницы: название, бейдж статуса, telegramId, команда, количество подписчиков
- Картчка «Публикации» на вкладке «Обзор» показывает количество подписчиков в правом верхнем углу
- Кнопка паузы обёрнута в `AlertDialog` с подтверждением и amber-стилизацией
- Ники каналов — кликабельные ссылки на `t.me/`

### TeamJobsPage (`pages/TeamJobsPage.tsx`)

- Строки задач — кликабельные `div` с `onClick` → `navigate()` (не `<Link>`, чтобы избежать вложенных `<a>`)
- Внутренние бейджи канала/источника — отдельные `<Link>` с `stopPropagation`

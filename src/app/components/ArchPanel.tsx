import { useState } from 'react'
import {
  ArrowRight,
  BrainCircuit,
  CircleHelp,
  FileText,
  Megaphone,
  Radio,
  Rss,
  Send,
  Settings,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react'

import { Badge } from './ui/badge'

type HelpTab = 'start' | 'flow' | 'sections'

interface StartStep {
  step: string
  title: string
  description: string
}

interface FlowCard {
  title: string
  description: string
  note: string
}

interface SectionCard {
  title: string
  description: string
  icon: React.ReactNode
  tone: string
}

interface GuideCard {
  title: string
  description: string
  note: string
}

const START_STEPS: StartStep[] = [
  {
    step: '01',
    title: 'Создайте команду',
    description: 'Команда — отдельное рабочее пространство. Каналы, источники, участники, реклама и лимиты не смешиваются между командами.',
  },
  {
    step: '02',
    title: 'Добавьте источник',
    description: 'Источник собирает контент. Telegram читает посты канала, RSS читает ленту, сайт парсится через onboarding и конфиг.',
  },
  {
    step: '03',
    title: 'Создайте канал',
    description: 'Канал — место публикации. Для работы бот должен быть добавлен в Telegram-канал и иметь право публиковать сообщения.',
  },
  {
    step: '04',
    title: 'Привяжите источники к каналу',
    description: 'Источник и канал связаны many-to-many: один источник можно использовать в нескольких каналах, и один канал может брать контент из нескольких источников.',
  },
  {
    step: '05',
    title: 'Настройте режим публикации',
    description: 'Выберите periodic, scheduled или every_material. От этого зависит, когда канал берет материал и когда отправляет пост.',
  },
  {
    step: '06',
    title: 'Проверьте первые материалы и публикации',
    description: 'После первого сканирования проверьте разделы «Контент», «Публикации» и «Задачи». Если что-то не пришло или не вышло, причина обычно видна там.',
  },
]

const FLOW_CARDS: FlowCard[] = [
  {
    title: 'Источник',
    description: 'Поставляет контент в систему. Источник принадлежит команде и может быть Telegram, RSS или сайтом.',
    note: 'Telegram зависит от доступа userbot, RSS — от самой ленты, сайт — от корректного onboarding-конфига.',
  },
  {
    title: 'Материал',
    description: 'Это собранный контент из источника. Материал еще не равен посту и может быть опубликован позже или не опубликован вообще.',
    note: 'Один материал может дать несколько публикаций в разных каналах.',
  },
  {
    title: 'Задача',
    description: 'Фоновая операция: сканирование, генерация, публикация, refresh metadata, onboarding сайта или RSS article agent.',
    note: 'Если материал не появился или пост не вышел, сначала проверяйте задачу и ее логи.',
  },
  {
    title: 'LLM',
    description: 'Используется там, где нужен AI: тестовая генерация поста, публикация с обработкой, onboarding сайта и RSS article agent.',
    note: 'Токены, стоимость, модель и этапы обработки вынесены в LLM-трейсы.',
  },
  {
    title: 'Публикация',
    description: 'Результат отправки материала в конкретный канал. Публикация бывает успешной или с ошибкой.',
    note: 'У публикации есть ссылка на канал, исходный материал, источник, задачу и иногда LLM trace.',
  },
  {
    title: 'Канал',
    description: 'Канал принимает публикации и хранит настройки постинга: режим, интервал, расписание, стиль и инструкции агенту.',
    note: 'Канал можно поставить на паузу, протестировать на материале и отвязать или привязать источники.',
  },
]

const WORKSPACE_SECTIONS: SectionCard[] = [
  {
    title: 'Обзор',
    description: 'Сводка по каналам, источникам, материалам, публикациям, задачам и участникам команды.',
    icon: <Sparkles className="size-4" />,
    tone: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/25 dark:border-sky-900 dark:text-sky-300',
  },
  {
    title: 'Каналы',
    description: 'Каналы публикации: привязка источников, режимы постинга, тестовая генерация, ручная публикация, история и настройки канала.',
    icon: <Radio className="size-4" />,
    tone: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/25 dark:border-blue-900 dark:text-blue-300',
  },
  {
    title: 'Источники',
    description: 'Источники сбора контента: Telegram, RSS и сайты. Здесь видны статус, ошибки, последний скан и AI-конфиги для website или RSS article agent.',
    icon: <Rss className="size-4" />,
    tone: 'bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/25 dark:border-violet-900 dark:text-violet-300',
  },
  {
    title: 'Контент',
    description: 'Раздел меню «Контент». Внутри лежат материалы, то есть собранный контент из источников до публикации.',
    icon: <FileText className="size-4" />,
    tone: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/25 dark:border-amber-900 dark:text-amber-300',
  },
  {
    title: 'Публикации',
    description: 'Фактически отправленные посты и неуспешные попытки. Есть фильтры по каналу, источнику, тегам и периоду.',
    icon: <Send className="size-4" />,
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/25 dark:border-emerald-900 dark:text-emerald-300',
  },
  {
    title: 'Задачи',
    description: 'Журнал фоновых задач. Здесь смотрят статусы, retry, ошибки, логи и связанные LLM-вызовы.',
    icon: <Zap className="size-4" />,
    tone: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/25 dark:border-orange-900 dark:text-orange-300',
  },
  {
    title: 'LLM-трейсы',
    description: 'Техническая детализация AI-вызовов: операция, модель, токены, стоимость, стадия и сырой ответ.',
    icon: <BrainCircuit className="size-4" />,
    tone: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-950/25 dark:border-fuchsia-900 dark:text-fuchsia-300',
  },
  {
    title: 'Участники',
    description: 'Участники команды и приглашения. Owner может приглашать и удалять, member обычно только просматривает.',
    icon: <Users className="size-4" />,
    tone: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/25 dark:border-teal-900 dark:text-teal-300',
  },
  {
    title: 'Настройки',
    description: 'Настройки команды: название, лимиты, использование лимитов и условия удаления команды. Настройки канала живут внутри самого канала.',
    icon: <Settings className="size-4" />,
    tone: 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300',
  },
  {
    title: 'Кампании',
    description: 'Рекламные кампании и рекламные посты. Сначала привязывается Telegram в профиле, затем через бота создаются рекламные посты, после этого из них собираются кампании.',
    icon: <Megaphone className="size-4" />,
    tone: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/25 dark:border-rose-900 dark:text-rose-300',
  },
]

const FLOW_STEPS = ['Источник', 'Материал', 'Задача', 'LLM', 'Публикация', 'Канал']

const SOURCE_TYPE_CARDS: GuideCard[] = [
  {
    title: 'Telegram-источник',
    description: 'Читает посты Telegram-канала. Подходит, если контент уже выходит в Telegram и его нужно переиспользовать.',
    note: 'Если у userbot нет доступа к каналу, новые материалы не будут собираться.',
  },
  {
    title: 'RSS-источник',
    description: 'Читает RSS или Atom-ленту. В простом режиме берет данные прямо из фида.',
    note: 'Если в ленте только короткие анонсы, можно включить режим feed_with_article_agent и догружать полные статьи.',
  },
  {
    title: 'Website-источник',
    description: 'Парсит сайт через onboarding. Система строит конфиг селекторов и показывает примеры найденных статей.',
    note: 'Используйте этот тип, когда у сайта нет удобного RSS или нужен контроль над тем, какие блоки страницы считаются статьей.',
  },
]

const PUBLISH_MODE_CARDS: GuideCard[] = [
  {
    title: 'periodic',
    description: 'Канал публикует материалы с фиксированным интервалом.',
    note: 'Подходит, когда нужен ровный поток постов без жесткого расписания по дням и часам.',
  },
  {
    title: 'scheduled',
    description: 'Публикация идет по расписанию: дни, время и таймзона.',
    note: 'Подходит, когда посты должны выходить в конкретные окна, например по будням утром и вечером.',
  },
  {
    title: 'every_material',
    description: 'Каждый новый подходящий материал отправляется в канал с учетом минимального интервала между постами.',
    note: 'Подходит для почти мгновенной публикации. В этом режиме особенно важно следить за качеством источника и стратегии выбора.',
  },
]

const RULE_CARDS: GuideCard[] = [
  {
    title: 'Связи между сущностями',
    description: 'Команда содержит каналы, источники, участников, кампании и лимиты. Источник и канал связаны many-to-many. Источник собирает материалы. Материал может дать несколько публикаций. Задачи и LLM-трейсы фиксируют обработку.',
    note: 'Если ищете причину проблемы, обычно проверяют связку источник → материал → задача → публикация.',
  },
  {
    title: 'Ограничения',
    description: 'Лимиты считаются на команду: посты в день, запуски AI-агента, число источников, каналов и участников.',
    note: 'Ожидающие приглашения тоже занимают слот участника. Команду нельзя удалить, пока в ней есть каналы, источники, лишние участники или pending invite.',
  },
  {
    title: 'Приглашения в команду',
    description: 'Приглашение создается по email в разделе «Участники». После этого появляется pending invite и ссылка-приглашение.',
    note: 'Owner может отменять приглашения и удалять участников. Member обычно только просматривает состав команды.',
  },
  {
    title: 'Реклама',
    description: 'Рекламный пост сначала создается через Telegram-бота командой /ads и сохраняется в команде. Затем из выбранного рекламного поста создается кампания на нужные каналы.',
    note: 'Для рекламы сначала привяжите Telegram в профиле. В деталях кампании видны отправка по каналам, ошибки и просмотры.',
  },
]

export function ArchPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HelpTab>('start')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex size-10 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-900/30 transition-colors hover:bg-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
        title="Справка по сервису"
      >
        <CircleHelp className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 dark:shadow-black/50">
            <div className="border-b border-gray-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
                    <CircleHelp className="size-5" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Справка по сервису</h2>
                      <Badge variant="secondary" className="text-xs">
                        AI Poster
                      </Badge>
                    </div>
                    <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                      Короткая встроенная документация по тому, как устроена работа с командами, источниками, каналами, задачами и публикациями.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 px-6 pt-3 dark:border-gray-800">
              <div className="flex flex-wrap gap-1">
                {([
                  { id: 'start', label: 'Быстрый старт' },
                  { id: 'flow', label: 'Как это работает' },
                  { id: 'sections', label: 'Разделы сервиса' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-gray-900 font-medium text-gray-900 dark:border-gray-100 dark:text-gray-100'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'start' ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 dark:border-sky-900 dark:from-sky-950/20 dark:to-gray-900">
                    <div className="mb-2 text-sm font-semibold text-sky-900 dark:text-sky-200">С чего начать</div>
                    <p className="max-w-3xl text-sm text-sky-900/80 dark:text-sky-200/80">
                      Логика сервиса такая: источник собирает контент, материал попадает в команду, канал берет подходящие материалы по своим правилам, задача обрабатывает публикацию, а результат фиксируется в публикациях и задачах.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {START_STEPS.map((item) => (
                      <div key={item.step} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
                            {item.step}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</div>
                        </div>
                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
                      <h3 className="mb-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">Что важно для первой публикации</h3>
                      <div className="space-y-2 text-sm text-emerald-900/85 dark:text-emerald-200/80">
                        <div>Бот должен иметь право публиковать в Telegram-канал.</div>
                        <div>Источник должен быть активен и привязан хотя бы к одному каналу.</div>
                        <div>После добавления источника нужно дождаться первых материалов или вручную запустить сканирование или получение.</div>
                        <div>Если канал на паузе, материалы будут накапливаться, но новые посты не выйдут.</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
                      <h3 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-200">Минимальная рабочая схема</h3>
                      <div className="space-y-2 text-sm text-amber-900/85 dark:text-amber-200/80">
                        <div>1. Команда</div>
                        <div>2. Источник</div>
                        <div>3. Канал</div>
                        <div>4. Привязка источника к каналу</div>
                        <div>5. Настройка режима публикации</div>
                        <div>6. Проверка материалов, задач и итоговых публикаций</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 dark:border-teal-900 dark:bg-teal-950/20">
                      <h3 className="mb-3 text-sm font-semibold text-teal-900 dark:text-teal-200">Как пригласить пользователя в команду</h3>
                      <div className="space-y-2 text-sm text-teal-900/85 dark:text-teal-200/80">
                        <div>1. Откройте раздел «Участники».</div>
                        <div>2. Нажмите «Пригласить» и введите email.</div>
                        <div>3. В команде появится pending invite и ссылка-приглашение.</div>
                        <div>4. Пока приглашение ожидает принятия, оно уже занимает слот в лимите участников.</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/20">
                      <h3 className="mb-3 text-sm font-semibold text-rose-900 dark:text-rose-200">Как работает реклама</h3>
                      <div className="space-y-2 text-sm text-rose-900/85 dark:text-rose-200/80">
                        <div>Сначала привяжите Telegram-аккаунт в профиле.</div>
                        <div>Потом создайте рекламный пост через Telegram-бота командой <code>/ads</code>.</div>
                        <div>После этого соберите кампанию и выберите каналы для отправки.</div>
                        <div>Статус отправки, ошибки и просмотры видны в деталях кампании.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'flow' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">Поток работы сервиса</h3>
                    <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
                      Ниже показан стандартный путь контента внутри системы: от внешнего источника до опубликованного поста в канале.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 dark:border-gray-800 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/80">
                    <div className="flex flex-wrap items-center gap-2">
                      {FLOW_STEPS.map((step, index) => (
                        <div key={step} className="flex items-center gap-2">
                          <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100">
                            {step}
                          </div>
                          {index < FLOW_STEPS.length - 1 ? <ArrowRight className="size-4 text-slate-400 dark:text-slate-500" /> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {FLOW_CARDS.map((card) => (
                      <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950/40">
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h4>
                        <p className="mb-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{card.description}</p>
                        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                          {card.note}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Типы источников</h3>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {SOURCE_TYPE_CARDS.map((card) => (
                        <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950/40">
                          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h4>
                          <p className="mb-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{card.description}</p>
                          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                            {card.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Типы публикации</h3>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {PUBLISH_MODE_CARDS.map((card) => (
                        <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950/40">
                          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h4>
                          <p className="mb-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{card.description}</p>
                          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                            {card.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Связи, ограничения и права</h3>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {RULE_CARDS.map((card) => (
                        <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950/40">
                          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h4>
                          <p className="mb-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{card.description}</p>
                          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                            {card.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                      <div className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">Источник не равен каналу</div>
                      <p className="text-sm text-blue-900/80 dark:text-blue-200/80">
                        Источник поставляет контент, а канал принимает публикации. Один источник можно привязать к нескольким каналам.
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
                      <div className="mb-2 text-sm font-semibold text-violet-900 dark:text-violet-200">Материал не равен публикации</div>
                      <p className="text-sm text-violet-900/80 dark:text-violet-200/80">
                        Материал — это собранное сырье. Публикация — это уже готовый результат отправки в конкретный канал.
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                      <div className="mb-2 text-sm font-semibold text-rose-900 dark:text-rose-200">Ошибки чаще всего видны в задачах</div>
                      <p className="text-sm text-rose-900/80 dark:text-rose-200/80">
                        Если материал не появился или пост не вышел, сначала проверяйте фоновые задачи и статус источника или канала.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'sections' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">Основные разделы</h3>
                    <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
                      Это карта пользовательского интерфейса. Используйте ее, чтобы быстро понять, где настраивать сущность, где смотреть результат и где искать ошибку.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {WORKSPACE_SECTIONS.map((section) => (
                      <div key={section.title} className={`rounded-xl border p-4 ${section.tone}`}>
                        <div className="mb-3 flex items-center gap-2">
                          {section.icon}
                          <div className="text-sm font-semibold">{section.title}</div>
                        </div>
                        <p className="text-sm leading-6 opacity-90">{section.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <span>Встроенная мини-документация по AI Poster</span>
              <button onClick={() => setOpen(false)} className="transition-colors hover:text-gray-700 dark:hover:text-gray-200">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

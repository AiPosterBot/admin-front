// ══════════════════════════════════════════════════════════════════════
//  ArchPanel — визуальная документация новой архитектуры.
//  Доступна через кнопку ⚙ в нижнем правом углу (только dev-режим).
//  Показывает слои: DTO → Services → Hooks → RBAC → Validators.
// ══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Layers, X, ChevronRight, Database, Shield, Zap, FileCode,
  CheckCircle, ArrowRight, Code2, Box,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { useTeamPermissions, useAdminPermissions, permissionsForRole } from "../lib/rbac";
import { useAuth } from "../context/AuthContext";
import { useTeam } from "../context/TeamContext";

interface LayerCard {
  icon: React.ReactNode;
  title: string;
  file: string;
  color: string;
  items: string[];
}

const LAYERS: LayerCard[] = [
  {
    icon: <FileCode className="size-4" />,
    title: "DTO / Типы",
    file: "types/dto.ts",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    items: [
      "JobType — литеральный union (8 типов)",
      "JobParams — discriminated union по type",
      "JobResult — discriminated union по type",
      "AnyJob = { [T in JobType]: TypedJob<T> }[JobType]",
      "LLMTraceDTO — toolCalls без any[]",
      "ServiceResult<T> = ok(data) | err(msg)",
      "Type guards: isJobType, getJobParams, getJobResult",
    ],
  },
  {
    icon: <Database className="size-4" />,
    title: "Сервисный слой",
    file: "services/",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    items: [
      "sourceService — getTeamSources, getSourceById (с teamId guard), CRUD",
      "channelService — getTeamChannels, getChannelById (с teamId guard), CRUD",
      "jobService — getTeamJobs, getJobById (с teamId guard)",
      "memberService — inviteMember, removeMember, cancelInvitation",
      "Все методы возвращают ServiceResult<T> (ok/err)",
      "Дублирование URL → ошибка DUPLICATE_URL",
      "Удаление owner → ошибка OWNER_PROTECTED",
    ],
  },
  {
    icon: <Zap className="size-4" />,
    title: "Реактивные хуки",
    file: "hooks/ + lib/asyncState.ts",
    color: "bg-green-50 border-green-200 text-green-800",
    items: [
      "useTeamSources() — auto-refetch при смене команды",
      "useTeamChannels() — auto-refetch при смене команды",
      "useTeamMembers() — members + invitations, auto-refetch",
      "useTeamScopedEntity() — route guard с redirect",
      "AsyncState: idle | loading | success | error | empty",
      "useAsync(fetcher, deps) — версионированный refetch",
      "invalidate() заменяет forceUpdate + ручной setState",
    ],
  },
  {
    icon: <Shield className="size-4" />,
    title: "RBAC",
    file: "lib/rbac.ts",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    items: [
      "Permission — литеральный union (24 права)",
      "can(role, permission) — чистая функция, без side-effects",
      "useTeamPermissions() — role + can() для текущей команды",
      "useAdminPermissions() — isRoot, canManageAdmins",
      "MEMBER_PERMISSIONS — права участника (ReadonlySet)",
      "OWNER_EXTRA_PERMISSIONS — права owner сверх member",
      "permissionsForRole(role) — для документации/тестов",
    ],
  },
  {
    icon: <CheckCircle className="size-4" />,
    title: "Валидация (Zod)",
    file: "lib/validators.ts",
    color: "bg-teal-50 border-teal-200 text-teal-800",
    items: [
      "rssSourceSchema — URL валидация",
      "telegramSourceSchema — transform (strips t.me/, @)",
      "websiteSourceSchema — URL + name",
      "channelSchema — name + telegramId regex",
      "inviteSchema — email validation",
      "adminSchema — nickname regex + password minLength",
      "safeParse() — без throw, возвращает { ok, data | errors }",
    ],
  },
  {
    icon: <Box className="size-4" />,
    title: "Team Scope Guard",
    file: "hooks/useTeamScopedEntity.ts",
    color: "bg-red-50 border-red-200 text-red-800",
    items: [
      "SourceDetailPage: source.teamId === currentTeamId",
      "ChannelDetailPage: channel.teamId === currentTeamId",
      "JobDetailPage: job.teamId === currentTeamId",
      "При несовпадении — navigate(fallbackPath, { replace: true })",
      "TeamScopeGuard<T> — render-prop компонент для detail-страниц",
      "Двойная проверка: сервис + хук (defence in depth)",
    ],
  },
];

export function ArchPanel() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"layers" | "rbac" | "async">("layers");

  const { currentUser, currentAdmin } = useAuth();
  const { currentTeamId } = useTeam();
  const { role, can } = useTeamPermissions();
  const { isRoot, canManageAdmins } = useAdminPermissions();

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-full size-10 flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors"
        title="Архитектурная панель (dev)"
      >
        <Layers className="size-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">Архитектура API-слоя</h2>
                <Badge variant="secondary" className="text-xs">dev</Badge>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b">
              {(["layers", "rbac", "async"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm rounded-t-md transition-colors -mb-px border-b-2 ${
                    activeTab === tab
                      ? "border-gray-900 text-gray-900 font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "layers" ? "Слои" : tab === "rbac" ? "RBAC (текущий сеанс)" : "Async State"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {activeTab === "layers" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Архитектура разделена на 6 независимых слоёв. При переходе на backend заменяются только тела методов в <code className="text-xs bg-gray-100 px-1 rounded">services/</code>.
                  </p>
                  {/* Architecture flow */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mb-2">
                    {["mock-data.ts", "services/", "hooks/", "pages/"].map((label, i, arr) => (
                      <span key={label} className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-0.5 rounded">{label}</code>
                        {i < arr.length - 1 && <ArrowRight className="size-3 text-gray-400" />}
                      </span>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {LAYERS.map((layer) => (
                      <div
                        key={layer.title}
                        className={`rounded-lg border p-4 ${layer.color}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {layer.icon}
                          <span className="font-medium text-sm">{layer.title}</span>
                          <code className="text-xs opacity-70 ml-auto">{layer.file}</code>
                        </div>
                        <ul className="space-y-1">
                          {layer.items.map((item) => (
                            <li key={item} className="flex items-start gap-1.5 text-xs opacity-80">
                              <ChevronRight className="size-3 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "rbac" && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-500">
                    Текущие права в этом сеансе. Меняйте пользователя/команду — права обновятся.
                  </p>

                  {/* Current session */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
                      <div className="font-medium text-sm text-gray-800">Сессия</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Тип</span>
                          <Badge variant="outline" className="text-xs">
                            {currentUser ? "User" : currentAdmin ? "Admin" : "—"}
                          </Badge>
                        </div>
                        {currentUser && (
                          <>
                            <div className="flex justify-between">
                              <span>Email</span>
                              <code className="bg-gray-200 px-1 rounded">{currentUser.email}</code>
                            </div>
                            <div className="flex justify-between">
                              <span>Команда</span>
                              <code className="bg-gray-200 px-1 rounded">{currentTeamId ?? "—"}</code>
                            </div>
                            <div className="flex justify-between">
                              <span>Роль в команде</span>
                              <Badge variant={role === "owner" ? "default" : "secondary"} className="text-xs">
                                {role ?? "—"}
                              </Badge>
                            </div>
                          </>
                        )}
                        {currentAdmin && (
                          <>
                            <div className="flex justify-between">
                              <span>Nickname</span>
                              <code className="bg-gray-200 px-1 rounded">{currentAdmin.nickname}</code>
                            </div>
                            <div className="flex justify-between">
                              <span>Root</span>
                              <Badge variant={isRoot ? "default" : "secondary"} className="text-xs">
                                {isRoot ? "Да" : "Нет"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>canManageAdmins</span>
                              <Badge variant={canManageAdmins ? "default" : "outline"} className="text-xs">
                                {canManageAdmins ? "✓" : "✗"}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {role && (
                      <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 space-y-2">
                        <div className="font-medium text-sm text-amber-800">
                          Права роли «{role}»
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {permissionsForRole(role).map((perm) => (
                            <div key={perm} className="flex items-center gap-1.5 text-xs text-amber-700">
                              <CheckCircle className="size-3 text-green-500 shrink-0" />
                              {perm}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick permission checks */}
                  {role && (
                    <div className="rounded-lg border p-4 bg-white">
                      <div className="font-medium text-sm text-gray-800 mb-3">Быстрые проверки can()</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(["source:delete", "source:create", "source:reonboard",
                           "channel:delete", "member:invite", "member:remove",
                           "team:settings", "team:delete", "tag:manage"] as const).map((perm) => (
                          <div
                            key={perm}
                            className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded text-xs border ${
                              can(perm)
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-gray-50 border-gray-200 text-gray-400"
                            }`}
                          >
                            <span className="font-mono">{perm}</span>
                            <span>{can(perm) ? "✓" : "✗"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "async" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Единая модель асинхронных состояний из <code className="text-xs bg-gray-100 px-1 rounded">lib/asyncState.ts</code>.
                    Заменяет разрозненные <code className="text-xs bg-gray-100 px-1 rounded">isLoading/data/error</code>.
                  </p>

                  {/* State machine */}
                  <div className="rounded-lg border p-4 bg-gray-50">
                    <div className="font-medium text-sm text-gray-800 mb-3">Машина состояний</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { state: "idle", color: "bg-gray-100 text-gray-600", desc: "Начальное состояние" },
                        { state: "loading", color: "bg-blue-100 text-blue-700", desc: "Запрос выполняется" },
                        { state: "success", color: "bg-green-100 text-green-700", desc: "Данные получены" },
                        { state: "error", color: "bg-red-100 text-red-700", desc: "Ошибка запроса" },
                        { state: "empty", color: "bg-amber-100 text-amber-700", desc: "Пустой результат" },
                      ].map(({ state, color, desc }) => (
                        <div key={state} className={`rounded-md px-3 py-2 ${color} text-xs`}>
                          <div className="font-mono font-medium">{state}</div>
                          <div className="opacity-70 mt-0.5">{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Usage examples */}
                  <div className="rounded-lg border p-4 bg-white">
                    <div className="font-medium text-sm text-gray-800 mb-3 flex items-center gap-2">
                      <Code2 className="size-4" /> Паттерны использования
                    </div>
                    <div className="space-y-4 text-xs font-mono text-gray-700">
                      <div>
                        <div className="text-gray-500 mb-1">// Список (auto-invalidate при смене команды)</div>
                        <code className="block bg-gray-50 rounded p-2 whitespace-pre-wrap">{`const { state, invalidate } = useTeamSources();
// После мутации — вызов invalidate() перечитывает данные
await sourceService.deleteSource(id, teamId);
invalidate();`}</code>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">// Детальная страница с team scope guard</div>
                        <code className="block bg-gray-50 rounded p-2 whitespace-pre-wrap">{`// В компоненте — автоматический redirect при несовпадении команды:
const source = mockSources.find(
  s => s.id === sourceId && s.teamId === currentTeamId
);`}</code>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">// Мутация с обработкой ошибки</div>
                        <code className="block bg-gray-50 rounded p-2 whitespace-pre-wrap">{`const result = await memberService.inviteMember(teamId, email);
if (!result.ok) {
  setError(result.error); // 'ALREADY_MEMBER' | 'ALREADY_INVITED'
  return;
}
invalidate(); toast.success("Приглашение отправлено");`}</code>
                      </div>
                    </div>
                  </div>

                  {/* Migration path */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="font-medium text-sm text-blue-800 mb-2">Путь к реальному backend</div>
                    <div className="space-y-1 text-xs text-blue-700">
                      {[
                        "1. Заменить тела функций в services/ на fetch/axios вызовы",
                        "2. ServiceResult<T> уже совместим с axios-ответами",
                        "3. Хуки (useTeamSources и др.) не меняются",
                        "4. Страницы не меняются — они работают с AsyncState",
                        "5. При ошибках backend → state.status === 'error' → UI показывает сообщение",
                      ].map((step) => (
                        <div key={step} className="flex items-start gap-1.5">
                          <ChevronRight className="size-3 mt-0.5 shrink-0" />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-3 flex items-center justify-between text-xs text-gray-400">
              <span>AI Poster · API Architecture Layer</span>
              <button onClick={() => setOpen(false)} className="hover:text-gray-600 transition-colors">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { Link, useParams } from "react-router";
import { Activity, DollarSign, Zap } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Button } from "../components/ui/button";
// ── Service + guard layer ─────────────────────────────────────────────
import * as llmTraceService from "../services/llmTraceService";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";
import { useTeam } from "../context/TeamContext";

export function LLMTracePage() {
  const { traceId } = useParams<{ traceId: string }>();
  const { currentTeamId } = useTeam();

  // ── Team scope guard: загружает трейс через сервис и редиректит
  //    если он не принадлежит текущей команде ───────────────────────────
  const { state: traceState } = useTeamScopedEntity(
    () => llmTraceService.getTraceById(traceId!, currentTeamId!),
    [traceId, currentTeamId],
    "/llm-traces",
  );

  return (
    <TeamScopeGuard state={traceState} notFoundLabel="LLM трейс не найден или недоступен в этой команде">
    {(trace) => {
      const job = llmTraceService.getTraceJob(trace);

      return (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              {job ? (
                <Link to={`/jobs/${job.id}`} className="hover:text-blue-600 flex items-center gap-1">
                  ← Задача
                </Link>
              ) : (
                <Link to="/llm-traces" className="hover:text-blue-600 flex items-center gap-1">
                  ← LLM Трейсы
                </Link>
              )}
              <span>/</span>
              <span className="text-gray-900">LLM Трейс</span>
            </div>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900">LLM Трейс</h1>
                  <Badge variant="outline">{trace.model}</Badge>
                </div>
                <p className="text-gray-600">Trace ID: {trace.id}</p>
                {job && (
                  <Link
                    to={`/jobs/${job.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Перейти к связанной задаче →
                  </Link>
                )}
              </div>
              <Activity className="size-8 text-purple-600" />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Всего токенов
                </CardTitle>
                <Zap className="size-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {trace.totalTokens.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {trace.promptTokens} промпт + {trace.completionTokens} ответ
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Стоимость</CardTitle>
                <DollarSign className="size-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  ${trace.cost.toFixed(4)}
                </div>
                <p className="text-xs text-gray-500 mt-1">USD</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Модель</CardTitle>
                <Activity className="size-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-gray-900">{trace.model}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(trace.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Промпт</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <pre className="text-sm whitespace-pre-wrap">{trace.prompt}</pre>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {trace.promptTokens.toLocaleString()} токенов
              </div>
            </CardContent>
          </Card>

          {/* Response */}
          <Card>
            <CardHeader>
              <CardTitle>Ответ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <pre className="text-sm whitespace-pre-wrap">{trace.response}</pre>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {trace.completionTokens.toLocaleString()} токенов
              </div>
            </CardContent>
          </Card>

          {/* Tool Calls */}
          {trace.toolCalls && trace.toolCalls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Вызовы инструментов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-50 border border-purple-200 rounded p-4">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(trace.toolCalls, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Request */}
          <Card>
            <CardHeader>
              <CardTitle>Сырой запрос</CardTitle>
            </CardHeader>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Показать сырой запрос
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
                    <pre className="text-xs">
                      {JSON.stringify(trace.rawRequest, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Raw Response */}
          <Card>
            <CardHeader>
              <CardTitle>Сырой ответ</CardTitle>
            </CardHeader>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Показать сырой ответ
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
                    <pre className="text-xs">
                      {JSON.stringify(trace.rawResponse, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      );
    }}
    </TeamScopeGuard>
  );
}

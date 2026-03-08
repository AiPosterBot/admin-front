import { Link } from "react-router";
import { Activity, DollarSign, Clock, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { mockLLMTraces, mockJobs } from "../data/mock-data";

export function AdminLLMAnalyticsPage() {
  const totalCost = mockLLMTraces.reduce((sum, t) => sum + t.cost, 0);
  const totalTokens = mockLLMTraces.reduce((sum, t) => sum + t.totalTokens, 0);
  const avgLatency =
    mockLLMTraces.reduce((sum, t) => sum + t.latencyMs, 0) / mockLLMTraces.length;
  const avgCost = totalCost / mockLLMTraces.length;

  // Группировка по моделям
  const byModel = mockLLMTraces.reduce((acc, trace) => {
    if (!acc[trace.model]) {
      acc[trace.model] = { count: 0, cost: 0, tokens: 0 };
    }
    acc[trace.model].count++;
    acc[trace.model].cost += trace.cost;
    acc[trace.model].tokens += trace.totalTokens;
    return acc;
  }, {} as Record<string, { count: number; cost: number; tokens: number }>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">LLM Аналитика</h1>
        <p className="text-gray-600">
          Детальная статистика использования языковых моделей
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Всего запросов
            </CardTitle>
            <Activity className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {mockLLMTraces.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">За всё время</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Общая стоимость
            </CardTitle>
            <DollarSign className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Средняя: ${avgCost.toFixed(4)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Всего токенов
            </CardTitle>
            <Zap className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalTokens.toLocaleString("ru-RU")}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ~{Math.round(totalTokens / mockLLMTraces.length).toLocaleString("ru-RU")}{" "}
              на запрос
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Средняя задержка
            </CardTitle>
            <Clock className="size-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(avgLatency)}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">Среднее время ответа</p>
          </CardContent>
        </Card>
      </div>

      {/* By Model */}
      <Card>
        <CardHeader>
          <CardTitle>Статистика по моделям</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {Object.entries(byModel).map(([model, stats]) => (
              <div key={model} className="border rounded-lg p-3 space-y-1">
                <div className="font-medium text-sm">{model}</div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{stats.count} запр.</span>
                  <span>{stats.tokens.toLocaleString("ru-RU")} ток.</span>
                  <span>${stats.cost.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <TableHead>Модель</TableHead>
                <TableHead>Запросов</TableHead>
                <TableHead>Токенов</TableHead>
                <TableHead>Стоимость</TableHead>
                <TableHead>Средняя стоимость</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byModel).map(([model, stats]) => (
                <TableRow key={model}>
                  <TableCell className="font-medium">{model}</TableCell>
                  <TableCell>{stats.count}</TableCell>
                  <TableCell>{stats.tokens.toLocaleString("ru-RU")}</TableCell>
                  <TableCell>${stats.cost.toFixed(4)}</TableCell>
                  <TableCell>${(stats.cost / stats.count).toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Traces */}
      <Card>
        <CardHeader>
          <CardTitle>Последние запросы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockLLMTraces.map((trace) => {
              const relatedJob = trace.jobId
                ? mockJobs.find((j) => j.id === trace.jobId)
                : null;

              return (
                <div
                  key={trace.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline">{trace.model}</Badge>
                      <span className="text-sm text-gray-600">
                        {new Date(trace.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-2">
                      <div>
                        <div className="text-gray-600 text-xs">Токены</div>
                        <div className="font-medium">
                          {trace.totalTokens.toLocaleString("ru-RU")}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs">Стоимость</div>
                        <div className="font-medium">${trace.cost.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs">Задержка</div>
                        <div className="font-medium">{trace.latencyMs}ms</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs">Промпт/Ответ</div>
                        <div className="font-medium">
                          {trace.promptTokens} / {trace.completionTokens}
                        </div>
                      </div>
                    </div>

                    {relatedJob && (
                      <Link to={`/jobs/${relatedJob.id}`}>
                        <div className="text-sm text-blue-600 hover:text-blue-700">
                          Связанная задача: {relatedJob.type.replace(/_/g, " ")} →
                        </div>
                      </Link>
                    )}

                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                        Показать промпт и ответ
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <div className="font-medium text-blue-900 mb-1">Промпт:</div>
                          <div className="text-blue-800 whitespace-pre-wrap">
                            {trace.prompt.substring(0, 200)}
                            {trace.prompt.length > 200 ? "..." : ""}
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded text-sm">
                          <div className="font-medium text-green-900 mb-1">Ответ:</div>
                          <div className="text-green-800 whitespace-pre-wrap">
                            {trace.response.substring(0, 200)}
                            {trace.response.length > 200 ? "..." : ""}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>

                  <Link to={`/admin/llm-traces/${trace.id}`}>
                    <Badge variant="outline" className="cursor-pointer">
                      Детали →
                    </Badge>
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Топ дорогих запросов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...mockLLMTraces]
                .sort((a, b) => b.cost - a.cost)
                .slice(0, 5)
                .map((trace) => (
                  <div
                    key={trace.id}
                    className="flex items-center justify-between p-2 rounded bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{trace.model}</div>
                      <div className="text-xs text-gray-600">
                        {trace.totalTokens.toLocaleString("ru-RU")} токенов
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-900">
                        ${trace.cost.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-600">{trace.latencyMs}ms</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Самые медленные запросы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...mockLLMTraces]
                .sort((a, b) => b.latencyMs - a.latencyMs)
                .slice(0, 5)
                .map((trace) => (
                  <div
                    key={trace.id}
                    className="flex items-center justify-between p-2 rounded bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{trace.model}</div>
                      <div className="text-xs text-gray-600">
                        {trace.totalTokens.toLocaleString("ru-RU")} токенов
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-900">
                        {trace.latencyMs}ms
                      </div>
                      <div className="text-xs text-gray-600">
                        ${trace.cost.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
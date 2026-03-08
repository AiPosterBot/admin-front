import { Link, useParams } from "react-router";
import { Clock, CheckCircle, AlertCircle, Activity, ArrowLeft, ExternalLink, Bot, BarChart2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Button } from "../components/ui/button";
import { useTeam } from "../context/TeamContext";
// ── Service + guard layer ─────────────────────────────────────────────
import * as jobService from "../services/jobService";
import * as adsService from "../services/adsService";
import * as llmTraceService from "../services/llmTraceService";
import * as postService from "../services/postService";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";

export function JobDetailPage() {
  const { jobId } = useParams();
  const { currentTeamId } = useTeam();

  // ── Team scope guard: хук загружает джоб через сервис и
  //    автоматически редиректит если он не принадлежит текущей ком��де ──
  const { state: jobState } = useTeamScopedEntity(
    () => jobService.getJobById(jobId!, currentTeamId!),
    [jobId, currentTeamId],
    "/jobs",
  );

  return (
    <TeamScopeGuard state={jobState} notFoundLabel="Задача не найдена или недоступна в этой команде">
    {(job) => {
  const relatedTraces = llmTraceService.getTracesByIds(job.llmTraceIds);

  // Если это publish job — найдём связанный posted item через сервис
  const relatedPost = postService.getPostByJobId(jobId!);

  // Если это ads_campaign job — найдём связанную кампанию
  const relatedCampaign = job.type === "ads_campaign" && job.params?.campaignId
    ? adsService.getCampaignById(job.params.campaignId)
    : null;

  const statusIcon = {
    success: <CheckCircle className="size-6 text-green-500" />,
    failed: <AlertCircle className="size-6 text-red-500" />,
    running: <Clock className="size-6 text-blue-500 animate-pulse" />,
    pending: <Clock className="size-6 text-gray-400" />,
  }[job.status];

  const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
    if (s === "success") return "default";
    if (s === "failed") return "destructive";
    return "secondary";
  };

  const jobTypeLabel = (type: string) => {
    switch (type) {
      case "publish_to_channel":    return "Публикация в канал";
      case "fetch_rss":             return "Сбор RSS";
      case "fetch_rss_hybrid":      return "Сбор RSS + HTML (hybrid)";
      case "fetch_telegram":        return "Сбор Telegram";
      case "fetch_website":         return "Сбор сайта";
      case "onboard_website":       return "Онбординг источника";
      case "onboard_rss_article":   return "Онбординг article-парсера RSS";
      case "ads_campaign":          return "Рассылка рекламы";
      default:                      return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/jobs" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="size-3.5" />
          Задачи
        </Link>
        <span>/</span>
        <span className="text-gray-900">{jobTypeLabel(job.type)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {jobTypeLabel(job.type)}
            </h1>
            <Badge
              variant={statusVariant(job.status)}
              className={job.status === "running" ? "bg-blue-100 text-blue-700 border-blue-200" : ""}
            >
              {job.status === "success"
                ? "Выполнено"
                : job.status === "failed"
                ? "Ошибка"
                : job.status === "running"
                ? "В работе"
                : "Ожидает"}
            </Badge>
          </div>
          <p className="text-gray-500 text-sm">Job ID: <code>{job.id}</code></p>
        </div>
        {statusIcon}
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Статус задачи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Статус</div>
              <div className="font-medium capitalize">{job.status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Создана</div>
              <div className="font-medium text-sm">
                {new Date(job.createdAt).toLocaleString("ru-RU")}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Завершена</div>
              <div className="font-medium text-sm">
                {job.completedAt
                  ? new Date(job.completedAt).toLocaleString("ru-RU")
                  : "—"}
              </div>
            </div>
          </div>
          {job.status === "running" && (
            <Badge variant="outline" className="text-sm text-blue-600 border-blue-200 bg-blue-50">
              В процессе
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Related Campaign (если это ads_campaign job) */}
      {relatedCampaign && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Рекламная кампания</CardTitle>
              <Link to={`/ads/${relatedCampaign.id}`}>
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <ExternalLink className="size-3" />
                  Открыть кампанию
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700">
              <span className="font-medium">{relatedCampaign.name}</span>
              <span className="text-gray-400 ml-2">
                · {relatedCampaign.targetChannels.length} каналов
                · отправлено {relatedCampaign.sentCount}
                {relatedCampaign.failedCount > 0 && (
                  <span className="text-red-500"> · ошибок {relatedCampaign.failedCount}</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Published Post (если это publish job) */}
      {relatedPost && (
        <Card>
          <CardHeader>
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <CardTitle>Опубликованный пост</CardTitle>
              <div className="flex gap-1.5 flex-wrap">
                <Link to={`/posts/${relatedPost.id}`}>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <ExternalLink className="size-3" />
                    Подробнее
                  </Button>
                </Link>
                <Link to={`/channels/${relatedPost.channelId}`}>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <ExternalLink className="size-3" />
                    {relatedPost.channelName}
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-500">
              Оригинальный материал:{" "}
              <span className="italic text-gray-700">{relatedPost.itemTitle}</span>
              {" · "}
              <Link to={`/sources/${relatedPost.sourceId}`} className="text-blue-500 hover:underline">
                {relatedPost.sourceName}
              </Link>
            </div>
            {relatedPost.mediaUrl && (
              <img
                src={relatedPost.mediaUrl}
                alt=""
                className="w-full max-h-64 object-cover rounded-lg"
              />
            )}
            <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap text-gray-800">
              {relatedPost.generatedContent}
            </div>
            <div className="text-xs text-gray-400">
              Опублковано: {new Date(relatedPost.postedAt).toLocaleString("ru-RU")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RSS Hybrid result card */}
      {job.type === "fetch_rss_hybrid" && job.result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 className="size-4 text-blue-500" />
              <CardTitle>Метрики hybrid-скана</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Всего в feed", value: job.result.totalFetched ?? 0, color: "text-gray-700", bg: "bg-gray-50" },
                { label: "Из RSS (FULL)", value: job.result.savedFromFeed ?? 0, color: "text-green-700", bg: "bg-green-50" },
                { label: "Из HTML статьи", value: job.result.parsedFromArticle ?? 0, color: "text-purple-700", bg: "bg-purple-50" },
                { label: "Ошибки", value: job.result.parseErrors ?? 0, color: "text-red-700", bg: "bg-red-50" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-lg p-3 text-center ${bg}`}>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className={`text-xs mt-0.5 ${color} opacity-75`}>{label}</div>
                </div>
              ))}
            </div>
            {job.result.fallbackSavedAsTeaser > 0 && (
              <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                Тизер-фолбэк (article parser недоступен): {job.result.fallbackSavedAsTeaser}
              </div>
            )}
            {job.result.failedUrls && job.result.failedUrls.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 space-y-1.5 border border-red-100">
                <div className="text-xs font-medium text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  Не удалось распарсить ({job.result.failedUrls.length})
                </div>
                {job.result.failedUrls.map((url: string, i: number) => (
                  <div key={i} className="text-[11px] font-mono text-red-500 break-all">{url}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RSS Article onboard result card */}
      {job.type === "onboard_rss_article" && job.result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-purple-500" />
              <CardTitle>Результат article-агента</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Версия конфига", value: `v${job.result.configVersion ?? 1}`, color: "text-purple-700", bg: "bg-purple-50" },
                { label: "Статей проверено", value: job.result.sampleArticlesParsed ?? 0, color: "text-blue-700", bg: "bg-blue-50" },
                { label: "Вердикт", value: job.result.verdict === "pass" ? "PASS ✅" : "FAIL ❌", color: job.result.verdict === "pass" ? "text-green-700" : "text-red-700", bg: job.result.verdict === "pass" ? "bg-green-50" : "bg-red-50" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-lg p-3 text-center ${bg}`}>
                  <div className={`text-lg font-bold ${color}`}>{value}</div>
                  <div className={`text-xs mt-0.5 ${color} opacity-75`}>{label}</div>
                </div>
              ))}
            </div>
            {job.params?.sourceId && (
              <div className="text-xs text-gray-500">
                Источник: <span className="font-medium text-gray-700">{job.params.sourceName || job.params.sourceId}</span>
                {" · "}<span className="font-mono">{job.params.url}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Входные параметры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded p-4">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(job.params, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {job.result && (
        <Card>
          <CardHeader>
            <CardTitle>Результат</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {job.error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Ошибка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="font-medium text-red-900">{job.error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Логи выполнения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {(job.logs || []).slice(0, 5).map((log, index) => (
              <div key={index} className="font-mono text-sm text-gray-700 py-0.5">
                {log}
              </div>
            ))}
          </div>
          {(job.logs?.length || 0) > 5 && (
            <Collapsible className="mt-3">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  Все логи ({job.logs.length} строк)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-gray-900 text-gray-100 rounded p-4 max-h-80 overflow-y-auto">
                  {(job.logs || []).map((log, index) => (
                    <div key={index} className="font-mono text-xs py-0.5">
                      {log}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Related LLM Traces */}
      {relatedTraces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>LLM трейсы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedTraces.map((trace) => (
                <Link key={trace.id} to={`/llm-traces/${trace.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Activity className="size-5 text-purple-500" />
                      <div>
                        <div className="font-medium text-sm">{trace.model}</div>
                        <div className="text-xs text-gray-500">
                          {trace.totalTokens.toLocaleString()} токенов · ${trace.cost.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Подробнее →</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}}
    </TeamScopeGuard>
  );
}
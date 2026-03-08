import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Image, ExternalLink, CheckCircle, XCircle, Calendar, Database } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
// ── Service + guard layer ─────────────────────────────────────────────
import * as itemService from "../services/itemService";
import * as postService from "../services/postService";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";
import { useTeam } from "../context/TeamContext";

export function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { currentTeamId } = useTeam();

  const { state: itemState } = useTeamScopedEntity(
    () => itemService.getItemById(itemId!, currentTeamId!),
    [itemId, currentTeamId],
    "/items",
  );

  return (
    <TeamScopeGuard state={itemState} notFoundLabel="Материал не найден или недоступен в этой команде">
    {(item) => {
      const source = itemService.getItemSource(item);
      const publications = postService.getPostsByItemId(item.id);
      const isPublished = publications.length > 0;

      return (
        <div className="space-y-6 max-w-3xl">
          {/* Back + header */}
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4"
            >
              <ArrowLeft className="size-4" />
              Назад к контенту
            </button>

            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{item.title}</h1>
              {isPublished ? (
                <Badge variant="default" className="whitespace-nowrap flex-shrink-0">
                  Опубликован
                </Badge>
              ) : (
                <Badge variant="secondary" className="whitespace-nowrap flex-shrink-0">
                  Не опубликован
                </Badge>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <Database className="size-3.5" />
                <Link
                  to={`/sources/${item.sourceId}`}
                  className="text-blue-500 hover:underline"
                >
                  {item.sourceName}
                </Link>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                <span>{new Date(item.extractedAt).toLocaleString("ru-RU")}</span>
              </div>
              {source?.url && (
                <>
                  <span>·</span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Источник
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Media */}
          {item.mediaUrl && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <img
                src={item.mediaUrl}
                alt=""
                className="w-full max-h-80 object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-lg border p-5">
            <h2 className="text-sm text-gray-400 mb-3 uppercase tracking-wide">Содержимое</h2>
            {item.mediaUrl ? null : (
              <div className="w-12 h-12 rounded bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <Image className="size-5 text-gray-300" />
              </div>
            )}
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
          </div>

          {/* Publications */}
          <div className="bg-white rounded-lg border">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">
                Публикации
                <span className="ml-2 text-gray-300">{publications.length}</span>
              </h2>
            </div>

            {publications.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Этот материал ещё не был опубликован ни в один канал
              </div>
            ) : (
              <div className="divide-y">
                {publications.map((pub) => (
                  <div key={pub.id} className="cursor-pointer" onClick={() => navigate(`/posts/${pub.id}`)}>
                  <div className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className="mt-0.5 flex-shrink-0">
                      {pub.status === "success" ? (
                        <CheckCircle className="size-4 text-green-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          to={`/channels/${pub.channelId}`}
                          className="font-medium text-sm text-gray-900 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pub.channelName}
                        </Link>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          {new Date(pub.postedAt).toLocaleString("ru-RU")}
                        </span>
                        {pub.status === "failed" && (
                          <Badge variant="destructive" className="text-xs ml-auto">Ошибка</Badge>
                        )}
                      </div>

                      {pub.status === "success" && (pub.views !== undefined || pub.reactions !== undefined) && (
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                          {pub.views !== undefined && <span>👁 {pub.views.toLocaleString("ru-RU")}</span>}
                          {pub.reactions !== undefined && <span>❤️ {pub.reactions}</span>}
                        </div>
                      )}

                      {pub.mediaUrl && (
                        <img
                          src={pub.mediaUrl}
                          alt=""
                          className="w-full max-h-48 object-cover rounded-lg"
                        />
                      )}
                      {pub.generatedContent && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 border border-gray-100 line-clamp-4">
                          {pub.generatedContent}
                        </p>
                      )}

                      {pub.llmTraceId && (
                        <Link
                          to={`/llm-traces/${pub.llmTraceId}`}
                          className="text-xs text-blue-500 hover:underline mt-2 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          LLM трейс →
                        </Link>
                      )}
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }}
    </TeamScopeGuard>
  );
}

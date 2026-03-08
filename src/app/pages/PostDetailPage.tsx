import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft, CheckCircle, AlertCircle, ExternalLink, Eye, Heart,
  Calendar, Database, Send, Hash, Cpu, Briefcase,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import * as postService from "../services/postService";
import { useTeamScopedEntity } from "../hooks/useTeamScopedEntity";
import { TeamScopeGuard } from "../components/TeamScopeGuard";
import { useTeam } from "../context/TeamContext";

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { currentTeamId } = useTeam();

  const { state: postState } = useTeamScopedEntity(
    () => postService.getPostById(postId!, currentTeamId!),
    [postId, currentTeamId],
    "/posts",
  );

  return (
    <TeamScopeGuard state={postState} notFoundLabel="Публикация не найдена или недоступна в этой команде">
    {(post) => {
      const channel  = postService.getPostChannel(post);
      const item     = postService.getPostItem(post);
      const source   = postService.getPostSource(post);
      const job      = postService.getPostJob(post);
      const llmTrace = postService.getPostLLMTrace(post);

      const telegramPostUrl =
        post.status === "success" && channel?.telegramId && post.telegramMessageId
          ? `https://t.me/${channel.telegramId.replace("@", "")}/${post.telegramMessageId}`
          : null;

      const isSuccess = post.status === "success";

      return (
        <div className="space-y-6 max-w-3xl">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Назад
          </button>

          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-bold text-gray-900 leading-snug">
                Публикация в {post.channelName}
              </h1>
              <Badge
                variant={isSuccess ? "default" : "destructive"}
                className="whitespace-nowrap flex-shrink-0"
              >
                {isSuccess ? (
                  <><CheckCircle className="size-3 mr-1" />Опубликован</>
                ) : (
                  <><AlertCircle className="size-3 mr-1" />Ошибка</>
                )}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                <span>{new Date(post.postedAt).toLocaleString("ru-RU")}</span>
              </div>
              {isSuccess && post.views !== undefined && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Eye className="size-3.5" />
                    <span>{post.views.toLocaleString("ru-RU")}</span>
                  </div>
                </>
              )}
              {isSuccess && post.reactions !== undefined && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Heart className="size-3.5" />
                    <span>{post.reactions.toLocaleString("ru-RU")}</span>
                  </div>
                </>
              )}
              {telegramPostUrl && (
                <>
                  <span>·</span>
                  <a
                    href={telegramPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Открыть в Telegram
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Generated content */}
          <div className="bg-white rounded-lg border">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Текст публикации</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {post.mediaUrl && (
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="w-full max-h-80 object-cover rounded-lg"
                />
              )}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {post.generatedContent}
              </div>
            </div>
          </div>

          {/* Links grid */}
          <div className="bg-white rounded-lg border divide-y">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Связанные объекты</h2>
            </div>

            {channel && (
              <Link to={`/channels/${channel.id}`}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <Send className="size-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">{channel.name}</div>
                    <span
                      className="text-xs text-blue-500 hover:text-blue-600 hover:underline cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`https://t.me/${channel.telegramId.replace("@", "")}`, "_blank");
                      }}
                    >
                      {channel.telegramId}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">Канал</Badge>
                </div>
              </Link>
            )}

            {item && (
              <Link to={`/items/${item.id}`}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <Hash className="size-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-400">Исходный материал</div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">Контент</Badge>
                </div>
              </Link>
            )}

            {source && (
              <Link to={`/sources/${source.id}`}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <Database className="size-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">{source.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{source.type}</div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">Источник</Badge>
                </div>
              </Link>
            )}

            {job && (
              <Link to={`/jobs/${job.id}`}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <Briefcase className="size-4 text-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">
                      {job.type === "publish_to_channel" ? "Публикация в канал" : job.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(job.createdAt).toLocaleString("ru-RU")}
                      {job.status === "success" && job.completedAt && (
                        <> · {Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000)}с</>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">Задача</Badge>
                </div>
              </Link>
            )}

            {llmTrace && (
              <Link to={`/llm-traces/${llmTrace.id}`}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <Cpu className="size-4 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">{llmTrace.model}</div>
                    <div className="text-xs text-gray-400">
                      {llmTrace.totalTokens.toLocaleString()} токенов · ${llmTrace.cost.toFixed(4)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">LLM</Badge>
                </div>
              </Link>
            )}

            {telegramPostUrl && (
              <a href={telegramPostUrl} target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <ExternalLink className="size-4 text-sky-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">Пост в Telegram</div>
                    <div className="text-xs text-gray-400">{telegramPostUrl}</div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">Ссылка</Badge>
                </div>
              </a>
            )}
          </div>

          {/* Error info */}
          {!isSuccess && job?.error && (
            <div className="bg-white rounded-lg border">
              <div className="px-5 py-3 border-b">
                <h2 className="text-sm text-red-500 uppercase tracking-wide">Ошибка</h2>
              </div>
              <div className="px-5 py-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">{job.error}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }}
    </TeamScopeGuard>
  );
}

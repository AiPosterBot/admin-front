import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  FileText,
  Trash2,
  User,
  Calendar,
  Image as ImageIcon,
  Megaphone,
  Info,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Pagination, usePagination } from "../components/Pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import {
  mockAdsPosts,
  mockAdsCampaigns,
  deleteAdsPost,
} from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 10;
const BOT_USERNAME = "ai_poster_bot";

type UsageFilter = "all" | "used" | "unused";

export function AdsPostsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);
  const [, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const allTeamPosts = useMemo(
    () =>
      mockAdsPosts
        .filter((p) => p.teamId === currentTeamId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTeamId, mockAdsPosts.length]
  );

  // Counts for filter buttons
  const usedCount = allTeamPosts.filter((p) => p.usedInCampaigns.length > 0).length;
  const unusedCount =
    allTeamPosts.filter((p) => p.usedInCampaigns.length === 0).length;

  // Filtered posts
  const teamPosts = useMemo(() => {
    let filtered = allTeamPosts;

    // Usage filter
    if (usageFilter === "used") {
      filtered = filtered.filter((p) => p.usedInCampaigns.length > 0);
    } else if (usageFilter === "unused") {
      filtered = filtered.filter((p) => p.usedInCampaigns.length === 0);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          p.createdByName.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [allTeamPosts, usageFilter, search]);

  const { totalPages, paginate, totalItems } = usePagination(
    teamPosts,
    PAGE_SIZE
  );
  const pagePosts = paginate(page);

  const handleDelete = (postId: string) => {
    deleteAdsPost(postId);
    toast.success("Пост удалён");
    setRefresh((r) => r + 1);
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Reset page when filters change
  const handleFilterChange = (filter: UsageFilter) => {
    setUsageFilter(filter);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Команда не выбрана
        </h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/ads")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Кампании
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Рекламные посты</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {team.name} · {allTeamPosts.length} постов
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div className="font-medium text-blue-900 text-sm">
              Как создать рекламный пост
            </div>
            <ol className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  1
                </span>
                <span>
                  Откройте бота{" "}
                  <a
                    href={`https://t.me/${BOT_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-blue-600"
                  >
                    <Bot className="size-3.5" />
                    @{BOT_USERNAME}
                  </a>{" "}
                  в Telegram
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  2
                </span>
                <span>
                  Отправьте боту сообщение с любым контентом (текст,
                  форматирование, фото, видео)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  3
                </span>
                <span>
                  Ответьте на это сообщение командой{" "}
                  <code className="bg-blue-200 px-1.5 py-0.5 rounded text-xs font-mono">
                    /ads
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  4
                </span>
                <span>
                  Бот предложит выбрать команду — пост будет сохранён и появится
                  здесь
                </span>
              </li>
            </ol>
            <p className="text-xs text-blue-600 mt-1">
              Для привязки Telegram-аккаунта перейдите в{" "}
              <button
                onClick={() => navigate("/profile")}
                className="underline underline-offset-2 hover:text-blue-800"
              >
                Профиль
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Input
          placeholder="Поиск постов..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange("all")}
            className={
              usageFilter === "all"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500"
            }
          >
            Все ({allTeamPosts.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange("used")}
            className={
              usageFilter === "used"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500"
            }
          >
            Используются ({usedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange("unused")}
            className={
              usageFilter === "unused"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500"
            }
          >
            Не используются ({unusedCount})
          </Button>
        </div>
      </div>

      {/* Posts list */}
      {teamPosts.length === 0 ? (
        <div className="bg-white border rounded-lg text-center py-12 text-gray-500">
          <FileText className="size-8 text-gray-300 mx-auto mb-3" />
          <div className="font-medium">Рекламных постов пока нет</div>
          <p className="text-sm mt-1">
            Отправьте сообщение боту и ответьте командой /ads
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {pagePosts.map((post) => {
            const campaignCount = post.usedInCampaigns.length;
            const campaigns = mockAdsCampaigns.filter((c) =>
              post.usedInCampaigns.includes(c.id)
            );

            return (
              <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Media thumbnail */}
                  {post.mediaUrl && (
                    <img
                      src={post.mediaUrl}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm text-gray-800 whitespace-pre-wrap ${
                        expandedPosts.has(post.id) ? "" : "line-clamp-3"
                      }`}
                    >
                      {post.text}
                    </p>

                    {/* Expanded media */}
                    {expandedPosts.has(post.id) && post.mediaUrl && (
                      <img
                        src={post.mediaUrl}
                        alt=""
                        className="max-w-md rounded-lg mt-3"
                      />
                    )}

                    {/* Expand/collapse toggle */}
                    {post.text.length > 150 && (
                      <button
                        onClick={() => toggleExpand(post.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1.5"
                      >
                        {expandedPosts.has(post.id) ? (
                          <>
                            <ChevronUp className="size-3" />
                            Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" />
                            Показать полностью
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <User className="size-3" />
                        {post.createdByName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="size-3" />
                        {new Date(post.createdAt).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {post.mediaUrl && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <ImageIcon className="size-3" />
                          Медиа
                        </span>
                      )}
                      {campaignCount > 0 ? (
                        <span className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="text-xs gap-1"
                          >
                            <Megaphone className="size-3" />
                            {campaignCount} кампан.
                          </Badge>
                          {campaigns.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => navigate(`/ads/${c.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
                            >
                              {c.name}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-400"
                        >
                          Не использован
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="flex-shrink-0">
                    {campaignCount > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className="text-gray-300 cursor-not-allowed"
                        title="Нельзя удалить: используется в кампании"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-600"
                            title="Удалить пост"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить рекламный пост?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Пост будет удалён безвозвратно. Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(post.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
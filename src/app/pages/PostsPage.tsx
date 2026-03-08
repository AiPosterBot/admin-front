import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  CheckCircle, AlertCircle, Eye, Heart, ExternalLink, Search,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Pagination, usePagination } from "../components/Pagination";
import { useTeam } from "../context/TeamContext";
import { useTeamPosts } from "../hooks/useTeamPosts";
import { Loader2 } from "lucide-react";
import { TagFilter } from "../components/TagFilter";
import { PeriodPicker, isInPeriod } from "../components/PeriodPicker";
import type { DateRange } from "react-day-picker";
// ── Service layer ────────────────────────────────────────────────────
import * as channelService from "../services/channelService";
import * as sourceService from "../services/sourceService";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 15;

export function PostsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);

  // ── Реактивный список через хук ──────────────────────────────────────
  const { state: postsState } = useTeamPosts();

  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [channelTagFilter, setChannelTagFilter] = useState<string[]>([]);
  const [sourceTagFilter, setSourceTagFilter] = useState<string[]>([]);

  const teamChannelTags = channelService.getTeamChannelTags(currentTeamId ?? "");
  const teamSourceTags = sourceService.getTeamSourceTags(currentTeamId ?? "");
  const teamChannels = channelService.getTeamChannelsList(currentTeamId ?? "");
  const teamSources = sourceService.getTeamSourcesList(currentTeamId ?? "");

  const teamPosts = postsState.status === "success" ? postsState.data : [];

  // ── useMemo MUST be before any early return ───────────────────────────
  const filteredPosts = useMemo(() => {
    return teamPosts.filter(p => {
      const matchesDate = isInPeriod(p.postedAt, dateRange);
      const matchesSearch =
        !searchQuery ||
        p.generatedContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sourceName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCh = channelFilter === "all" || p.channelId === channelFilter;
      const matchesSrc = sourceFilter === "all" || p.sourceId === sourceFilter;
      const matchesChTag = channelTagFilter.length === 0 || (() => {
        const tags = channelService.getChannelTagsById(p.channelId);
        return tags.some(t => channelTagFilter.includes(t.id));
      })();
      const matchesSrcTag = sourceTagFilter.length === 0 || (() => {
        const tags = sourceService.getSourceTagsById(p.sourceId);
        return tags.some(t => sourceTagFilter.includes(t.id));
      })();
      return matchesDate && matchesSearch && matchesCh && matchesSrc && matchesChTag && matchesSrcTag;
    });
  }, [teamPosts, dateRange, searchQuery, channelFilter, sourceFilter, channelTagFilter, sourceTagFilter]);

  const { totalPages, paginate, totalItems } = usePagination(filteredPosts, PAGE_SIZE);

  // ── Early returns only after all hooks ───────────────────────────────
  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  if (postsState.status === "loading" || postsState.status === "idle") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const pagePosts = paginate(page);

  const hasActiveFilters =
    searchQuery !== "" ||
    channelFilter !== "all" ||
    sourceFilter !== "all" ||
    dateRange !== undefined ||
    channelTagFilter.length > 0 ||
    sourceTagFilter.length > 0;

  const resetFilters = () => {
    setSearchQuery("");
    setChannelFilter("all");
    setSourceFilter("all");
    setDateRange(undefined);
    setChannelTagFilter([]);
    setSourceTagFilter([]);
    setPage(1);
  };

  const handleSelectChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Публикации</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {team.name} · {teamPosts.length} публикаций
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Поиск по тексту, каналу, источнику..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <PeriodPicker
          value={dateRange}
          onChange={(range) => { setDateRange(range); setPage(1); }}
        />

        {teamChannels.length > 0 && (
          <Select value={channelFilter} onValueChange={v => handleSelectChange(setChannelFilter, v)}>
            <SelectTrigger className={`h-8 text-sm w-auto min-w-[140px] ${channelFilter !== "all" ? "border-blue-400 bg-blue-50" : ""}`}>
              <SelectValue placeholder="Канал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все каналы</SelectItem>
              {teamChannels.map(ch => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {teamSources.length > 0 && (
          <Select value={sourceFilter} onValueChange={v => handleSelectChange(setSourceFilter, v)}>
            <SelectTrigger className={`h-8 text-sm w-auto min-w-[140px] ${sourceFilter !== "all" ? "border-blue-400 bg-blue-50" : ""}`}>
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {teamSources.map(src => (
                <SelectItem key={src.id} value={src.id}>{src.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <TagFilter
          tags={teamChannelTags}
          selectedTagIds={channelTagFilter}
          onChange={(ids) => { setChannelTagFilter(ids); setPage(1); }}
          label="Теги каналов"
        />
        <TagFilter
          tags={teamSourceTags}
          selectedTagIds={sourceTagFilter}
          onChange={(ids) => { setSourceTagFilter(ids); setPage(1); }}
          label="Теги источников"
        />

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-auto"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Posts list */}
      <div className="bg-white rounded-lg border divide-y">
        {pagePosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-gray-300 text-4xl mb-3">📨</div>
            <div className="font-medium">Публикации не найдены</div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-blue-600 text-sm mt-2 hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          pagePosts.map((post) => {
            const channel = teamChannels.find(c => c.id === post.channelId);
            const telegramPostUrl =
              post.status === "success" && channel?.telegramId && post.telegramMessageId
                ? `https://t.me/${channel.telegramId.replace("@", "")}/${post.telegramMessageId}`
                : null;

            return (
              <div
                key={post.id}
                className="flex items-start gap-4 px-4 py-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
                onClick={() => navigate(`/posts/${post.id}`)}
              >
                {/* Status icon */}
                <div className="mt-1 flex-shrink-0">
                  {post.status === "success" ? (
                    <CheckCircle className="size-4 text-green-500" />
                  ) : (
                    <AlertCircle className="size-4 text-red-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/channels/${post.channelId}`}
                        className="font-medium text-sm text-gray-900 hover:text-blue-600"
                        onClick={e => e.stopPropagation()}
                      >
                        {post.channelName}
                      </Link>
                      <span className="text-xs text-gray-400 tabular-nums">
                        {new Date(post.postedAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {post.status === "success" && (
                        <div className="flex items-center gap-2.5">
                          {post.views !== undefined && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Eye className="size-3" />{post.views.toLocaleString("ru-RU")}
                            </span>
                          )}
                          {post.reactions !== undefined && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Heart className="size-3" />{post.reactions}
                            </span>
                          )}
                        </div>
                      )}
                      {post.status === "failed" && (
                        <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                      )}
                    </div>
                  </div>

                  {/* Preview text + thumbnail */}
                  <div className="flex gap-3 mb-2">
                    <p className="text-sm text-gray-600 line-clamp-2 flex-1 min-w-0">
                      {post.generatedContent}
                    </p>
                    {post.mediaUrl && (
                      <img
                        src={post.mediaUrl}
                        alt=""
                        className="size-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    <span className="italic truncate max-w-[200px]">{post.itemTitle}</span>
                    <span>·</span>
                    <Link
                      to={`/sources/${post.sourceId}`}
                      className="text-blue-500 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {post.sourceName}
                    </Link>
                    {telegramPostUrl && (
                      <>
                        <span>·</span>
                        <a
                          href={telegramPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="size-3" />
                          TG
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
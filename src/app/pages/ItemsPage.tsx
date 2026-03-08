import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Filter, Image } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Pagination, usePagination } from "../components/Pagination";
import { useTeam } from "../context/TeamContext";
import { useTeamItems } from "../hooks/useTeamItems";
import { Loader2 } from "lucide-react";
import { TagFilter } from "../components/TagFilter";
// ── Service layer ────────────────────────────────────────────────────
import * as sourceService from "../services/sourceService";
import * as postService from "../services/postService";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 10;

type PublishFilter = "all" | "published" | "unpublished";

export function ItemsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);

  // ── Реактивный список через хук ──────────────────────────────────────
  const { state: itemsState } = useTeamItems();

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [page, setPage] = useState(1);
  const [sourceTagFilter, setSourceTagFilter] = useState<string[]>([]);

  const teamSourceTags = sourceService.getTeamSourceTags(currentTeamId ?? "");
  const teamSources = sourceService.getTeamSourcesList(currentTeamId ?? "");
  const teamPostedItems = postService.getTeamPostsList(currentTeamId ?? "");

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  if (itemsState.status === "loading" || itemsState.status === "idle") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const teamItems = itemsState.status === "success" ? itemsState.data : [];

  // Precompute publication map
  const publicationsByItem = new Map<string, typeof teamPostedItems>();
  for (const p of teamPostedItems) {
    const arr = publicationsByItem.get(p.itemId) || [];
    arr.push(p);
    publicationsByItem.set(p.itemId, arr);
  }

  const publishedCount = teamItems.filter(i => (publicationsByItem.get(i.id)?.length ?? 0) > 0).length;
  const unpublishedCount = teamItems.length - publishedCount;

  const filteredItems = teamItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || item.sourceId === sourceFilter;
    const publications = publicationsByItem.get(item.id) || [];
    const isPublished = publications.length > 0;
    const matchesPublish =
      publishFilter === "all" ||
      (publishFilter === "published" && isPublished) ||
      (publishFilter === "unpublished" && !isPublished);
    const matchesSrcTag = sourceTagFilter.length === 0 || (() => {
      const tags = sourceService.getSourceTagsById(item.sourceId);
      return tags.some(t => sourceTagFilter.includes(t.id));
    })();
    return matchesSearch && matchesSource && matchesPublish && matchesSrcTag;
  });

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const { totalPages, paginate, totalItems: paginationTotal } = usePagination(filteredItems, PAGE_SIZE);
  const pageItems = paginate(page);

  const publishFilterOptions: { value: PublishFilter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: teamItems.length },
    { value: "published", label: "Опубликованные", count: publishedCount },
    { value: "unpublished", label: "Не опубликованные", count: unpublishedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Контент</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {team.name} · все собранные материалы из источников
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Row 1: toggle filters + reset */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1 flex-wrap">
              {publishFilterOptions.map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange(setPublishFilter as (v: string) => void, value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    publishFilter === value
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {label}
                  <span className={`text-xs tabular-nums ${publishFilter === value ? "text-gray-300" : "text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {(publishFilter !== "all" || sourceFilter !== "all" || searchQuery || sourceTagFilter.length > 0) && (
            <button
              onClick={() => {
                setPublishFilter("all");
                setSourceFilter("all");
                setSearchQuery("");
                setSourceTagFilter([]);
                setPage(1);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Row 2: search + source dropdown */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Поиск по заголовку или контенту..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={v => handleFilterChange(setSourceFilter, v)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Все источники" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все источники</SelectItem>
              {teamSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TagFilter
            tags={teamSourceTags}
            selectedTagIds={sourceTagFilter}
            onChange={(ids) => { setSourceTagFilter(ids); setPage(1); }}
            label="Теги источников"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg border divide-y">
        {pageItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-gray-300 text-4xl mb-3">📄</div>
            <div className="font-medium">Материалы не найдены</div>
            {(publishFilter !== "all" || sourceFilter !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setPublishFilter("all");
                  setSourceFilter("all");
                  setSearchQuery("");
                  setPage(1);
                }}
                className="text-blue-600 text-sm mt-2 hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          pageItems.map((item) => {
            const publications = publicationsByItem.get(item.id) || [];
            const isPublished = publications.length > 0;

            return (
              <div
                key={item.id}
                className="flex items-start gap-4 px-4 py-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
                onClick={() => navigate(`/items/${item.id}`)}
              >
                {/* Thumbnail */}
                {item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt=""
                    className="w-16 h-16 object-cover rounded flex-shrink-0 bg-gray-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded flex-shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Image className="size-5 text-gray-300" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{item.title}</h3>
                    <div className="flex-shrink-0">
                      {isPublished ? (
                        <Badge variant="default" className="text-xs whitespace-nowrap">
                          {publications.length > 1
                            ? `${publications.length} канала`
                            : "Опубликован"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Не опубликован</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm mb-2 line-clamp-2">{item.content}</p>

                  {/* Publication channels */}
                  {publications.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {publications.map((pub) => (
                        <div
                          key={pub.id}
                          className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-md px-2 py-0.5 text-xs"
                        >
                          <div className="size-1.5 rounded-full bg-green-500" />
                          <Link
                            to={`/channels/${pub.channelId}`}
                            className="text-green-700 hover:underline font-medium"
                            onClick={e => e.stopPropagation()}
                          >
                            {pub.channelName}
                          </Link>
                          <span className="text-green-500">·</span>
                          <span className="text-green-600">
                            {new Date(pub.postedAt).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Link
                      to={`/sources/${item.sourceId}`}
                      className="text-blue-500 hover:underline"
                    >
                      {item.sourceName}
                    </Link>
                    <span>·</span>
                    <span>{new Date(item.extractedAt).toLocaleString("ru-RU")}</span>
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
        totalItems={paginationTotal}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
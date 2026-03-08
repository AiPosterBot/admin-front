import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Megaphone,
  Filter,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
  FileText,
  Eye,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Pagination, usePagination } from "../components/Pagination";
import { AddCampaignDialog } from "../components/AddCampaignDialog";
import {
  mockAdsCampaigns,
  mockAdsPosts,
  type AdsCampaign,
} from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import * as channelService from "../services/channelService";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "ready" | "sending" | "completed";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  ready: {
    label: "Готова",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="size-3.5" />,
  },
  sending: {
    label: "Отправка",
    color: "bg-amber-100 text-amber-700",
    icon: <Loader2 className="size-3.5" />,
  },
  completed: {
    label: "Завершена",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="size-3.5" />,
  },
};

export function AdsCampaignsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const team = teamService.getTeamById(currentTeamId);
  const [campaigns, setCampaigns] = useState(mockAdsCampaigns);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const teamPosts = mockAdsPosts.filter((p) => p.teamId === currentTeamId);

  const filtered =
    statusFilter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === statusFilter);

  const { totalPages, paginate, totalItems } = usePagination(
    filtered,
    PAGE_SIZE
  );
  const pageCampaigns = paginate(page);

  const handleFilterChange = (f: StatusFilter) => {
    setStatusFilter(f);
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

  const filterOptions: {
    value: StatusFilter;
    label: string;
    count: number;
    icon?: React.ReactNode;
  }[] = [
    { value: "all", label: "Все", count: campaigns.length },
    {
      value: "ready",
      label: "Готовы",
      count: campaigns.filter((c) => c.status === "ready").length,
      icon: <Clock className="size-3.5 text-blue-500" />,
    },
    {
      value: "sending",
      label: "Отправка",
      count: campaigns.filter((c) => c.status === "sending").length,
      icon: <Loader2 className="size-3.5 text-amber-500" />,
    },
    {
      value: "completed",
      label: "Завершены",
      count: campaigns.filter((c) => c.status === "completed").length,
      icon: <CheckCircle2 className="size-3.5 text-green-500" />,
    },
  ];

  const handleCreateCampaign = () => {
    setIsAddDialogOpen(true);
  };

  const handleCampaignCreated = (campaign: AdsCampaign) => {
    setCampaigns([...mockAdsCampaigns]);
    navigate(`/ads/${campaign.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Кампании</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {team.name} · {campaigns.length} кампаний
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/ads/posts")}
            className="flex-1 sm:flex-initial"
          >
            <FileText className="size-4 mr-2" />
            Посты
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 tabular-nums">
              {teamPosts.length}
            </span>
          </Button>
          <Button onClick={handleCreateCampaign} className="flex-1 sm:flex-initial">
            <Plus className="size-4 mr-2" />
            Создать кампанию
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-gray-400 shrink-0" />
          <div className="flex items-center gap-1 flex-wrap">
            {filterOptions.map(({ value, label, count, icon }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  statusFilter === value
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {icon}
                {label}
                <span
                  className={`text-xs tabular-nums ${
                    statusFilter === value ? "text-white/50" : "text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
        {statusFilter !== "all" && (
          <button
            onClick={() => handleFilterChange("all")}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Campaigns — Mobile cards */}
      <div className="md:hidden space-y-3">
        {pageCampaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Megaphone className="size-8 text-gray-300 mx-auto mb-3" />
            <div className="font-medium">
              {campaigns.length === 0
                ? "Кампаний пока нет"
                : "Нет кампаний с выбранным фильтром"}
            </div>
            {campaigns.length === 0 && (
              <Button className="mt-4" onClick={handleCreateCampaign}>
                <Plus className="size-4 mr-2" />
                Создать к��мпанию
              </Button>
            )}
          </div>
        ) : (
          pageCampaigns.map((campaign) => {
            const status = statusConfig[campaign.status];
            const post = mockAdsPosts.find((p) => p.id === campaign.adsPostId);
            const channelNames = channelService.getTeamChannelsList(currentTeamId ?? "")
              .filter((ch) => campaign.targetChannels.includes(ch.id))
              .map((ch) => ch.telegramId);
            const totalViews = Object.values(campaign.channelResults ?? {}).reduce(
              (sum, r) => sum + (r.viewsCount ?? 0),
              0
            );

            return (
              <div
                key={campaign.id}
                className="bg-white rounded-lg border p-4 active:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/ads/${campaign.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {campaign.name}
                    </div>
                    {post && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {post.text.split("\n")[0]}
                      </div>
                    )}
                  </div>
                  {status && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${status.color}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span>{channelNames.length} каналов</span>
                  {totalViews > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" /> {totalViews.toLocaleString("ru-RU")}
                    </span>
                  )}
                  <span className="text-green-600">{campaign.sentCount} отпр.</span>
                  {campaign.failedCount > 0 && (
                    <span className="text-red-600">
                      {campaign.failedCount} ошиб.
                    </span>
                  )}
                  {campaign.scheduledAt && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Calendar className="size-3" />
                      {new Date(campaign.scheduledAt).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Campaigns Table — Desktop */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Кампания</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Каналы</TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  Просмотры
                </span>
              </TableHead>
              <TableHead>Запланировано</TableHead>
              <TableHead>Создана</TableHead>
              <TableHead className="text-center">Отправлено / Ошибки / Всего</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageCampaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-gray-500"
                >
                  <Megaphone className="size-8 text-gray-300 mx-auto mb-3" />
                  <div className="font-medium">
                    {campaigns.length === 0
                      ? "Кампаний пока нет"
                      : "Нет кампаний с выбранным фильтром"}
                  </div>
                  {campaigns.length === 0 && (
                    <>
                      <div className="text-sm mt-1">
                        Создайте первую рекламную кампанию для мссовой рассылки
                      </div>
                      <Button
                        className="mt-4"
                        onClick={handleCreateCampaign}
                      >
                        <Plus className="size-4 mr-2" />
                        Создать кампанию
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageCampaigns.map((campaign) => {
                const status = statusConfig[campaign.status];
                const post = mockAdsPosts.find(
                  (p) => p.id === campaign.adsPostId
                );
                const channelNames = channelService.getTeamChannelsList(currentTeamId ?? "")
                  .filter((ch) =>
                    campaign.targetChannels.includes(ch.id)
                  )
                  .map((ch) => ch.telegramId);

                const MAX_VISIBLE_CHANNELS = 2;
                const visibleChannels = channelNames.slice(0, MAX_VISIBLE_CHANNELS);
                const hiddenCount = channelNames.length - MAX_VISIBLE_CHANNELS;

                return (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/ads/${campaign.id}`)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        {post && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">
                            {post.text.split("\n")[0]}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {status && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {visibleChannels.map((name) => (
                          <span
                            key={name}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://t.me/${name.replace("@", "")}`, "_blank");
                            }}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700 hover:bg-gray-200 hover:text-blue-600 cursor-pointer transition-colors"
                          >
                            {name}
                          </span>
                        ))}
                        {hiddenCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-xs text-gray-400">
                            +{hiddenCount}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {(() => {
                        const views = Object.values(campaign.channelResults ?? {}).reduce(
                          (sum, r) => sum + (r.viewsCount ?? 0), 0
                        );
                        return views > 0 ? (
                          <span className="text-sm font-medium text-gray-900">
                            {views.toLocaleString("ru-RU")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {campaign.scheduledAt ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="size-3.5 text-gray-400" />
                          {new Date(campaign.scheduledAt).toLocaleString(
                            "ru-RU",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(campaign.createdAt).toLocaleDateString(
                          "ru-RU"
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm tabular-nums">
                        <span className="text-green-600 font-medium">
                          {campaign.sentCount}
                        </span>
                        {" / "}
                        <span className="text-red-600 font-medium">
                          {campaign.failedCount}
                        </span>
                        {" / "}
                        <span className="text-gray-900 text-base font-semibold">
                          {campaign.targetChannels.length}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />

      <AddCampaignDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCreated={handleCampaignCreated}
      />
    </div>
  );
}
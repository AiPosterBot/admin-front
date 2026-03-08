import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  Megaphone,
  Image as ImageIcon,
  ExternalLink,
  User,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import {
  mockAdsCampaigns,
  mockAdsPosts,
  deleteAdsCampaign,
} from "../data/mock-data";
import * as channelService from "../services/channelService";

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
  failed: {
    label: "Ошибка",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="size-3.5" />,
  },
};

/** Build telegram channel link from telegramId like @channelname */
function tgChannelLink(telegramId: string) {
  return `https://t.me/${telegramId.replace("@", "")}`;
}

/** Build link to specific message in channel */
function tgMessageLink(telegramId: string, messageId: number) {
  return `https://t.me/${telegramId.replace("@", "")}/${messageId}`;
}

export function AdsCampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const campaign = mockAdsCampaigns.find((c) => c.id === campaignId);

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Megaphone className="size-10 text-gray-300 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Кампания не найдена
        </h2>
        <p className="text-gray-600 mb-4">
          Кампания с данным идентификатором не существует.
        </p>
        <Button variant="outline" onClick={() => navigate("/ads")}>
          <ArrowLeft className="size-4 mr-2" />
          Назад к кампаниям
        </Button>
      </div>
    );
  }

  const status = statusConfig[campaign.status];
  const post = mockAdsPosts.find((p) => p.id === campaign.adsPostId);
  const targetChannels = channelService.getTeamChannelsList(campaign.teamId).filter((c) =>
    campaign.targetChannels.includes(c.id)
  );

  const totalSends = campaign.sentCount + campaign.failedCount;
  const successRate =
    totalSends > 0 ? (campaign.sentCount / totalSends) * 100 : 0;

  // Подсчёт просмотров
  const totalViews = Object.values(campaign.channelResults ?? {}).reduce(
    (sum, r) => sum + (r.viewsCount ?? 0),
    0
  );

  const handleSendNow = () => {
    toast.info(
      "Отправка кампании будет доступна в ближайшем обновлении"
    );
  };

  const handleDeleteCampaign = () => {
    deleteAdsCampaign(campaignId);
    toast.success("Кампания успешно удалена");
    // Delay navigate so Radix AlertDialog portal can unmount cleanly
    setTimeout(() => navigate("/ads"), 0);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {campaign.name}
            </h1>
            {status && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
              >
                {status.icon}
                {status.label}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Создана{" "}
            {new Date(campaign.createdAt).toLocaleString("ru-RU")}
            {campaign.scheduledAt && (
              <>
                {" · "}
                <Calendar className="size-3.5 inline -mt-0.5 mr-0.5" />
                Запланировано на{" "}
                {new Date(campaign.scheduledAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </p>
        </div>
        {campaign.status === "ready" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-initial">
                  <Trash2 className="size-4 mr-2" />
                  Отменить
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить кампанию?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Кампания &laquo;{campaign.name}&raquo; будет удалена. Это действие необратимо.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Назад</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCampaign}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Удалить кампанию
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSendNow} className="flex-1 sm:flex-initial">
              <Send className="size-4 mr-2" />
              Отправить сейчас
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Каналов</div>
          <div className="text-2xl font-bold text-gray-900">
            {campaign.targetChannels.length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Просмотры</div>
          <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="size-5 text-gray-400" />
            {totalViews > 0 ? totalViews.toLocaleString("ru-RU") : "—"}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Отправлено</div>
          <div className="text-2xl font-bold text-green-700">
            {campaign.sentCount}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Ошибки</div>
          <div className="text-2xl font-bold text-red-700">
            {campaign.failedCount}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Успешность</div>
          <div className="text-2xl font-bold text-blue-700">
            {totalSends > 0 ? `${successRate.toFixed(0)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Post content */}
      <div className="bg-white border rounded-lg">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Рекламный пост</h2>
          {post && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <User className="size-3" />
              {post.createdByName} ·{" "}
              {new Date(post.createdAt).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
        <div className="p-5">
          {post ? (
            <div className="flex flex-col sm:flex-row gap-4">
              {post.mediaUrl && (
                <img
                  src={post.mediaUrl}
                  alt="Медиа"
                  className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {post.text}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <ImageIcon className="size-4" />
              Пост не найден
            </div>
          )}
        </div>
      </div>

      {/* Target channels */}
      <div className="bg-white border rounded-lg">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Целевые каналы ({targetChannels.length})
          </h2>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {targetChannels.map((channel) => {
            const result = campaign.channelResults?.[channel.id];
            const isSent = result?.status === "sent";
            const isFailed = result?.status === "failed";
            return (
              <div key={channel.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Link to={`/channels/${channel.id}`} className="font-medium text-sm text-blue-600 hover:text-blue-700 truncate">
                    {channel.name}
                  </Link>
                  {isSent && (
                    <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
                      <CheckCircle2 className="size-3" /> Отправлено
                    </span>
                  )}
                  {isFailed && (
                    <span className="flex items-center gap-1 text-xs text-red-600 shrink-0">
                      <XCircle className="size-3" /> Ошибка
                    </span>
                  )}
                  {!isSent && !isFailed && (
                    <Badge variant="outline" className="text-xs shrink-0">Ожидание</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <a href={tgChannelLink(channel.telegramId)} target="_blank" rel="noopener noreferrer" className="text-blue-500">{channel.telegramId}</a>
                  {isSent && result?.viewsCount ? (
                    <span className="flex items-center gap-0.5"><Eye className="size-3" />{result.viewsCount.toLocaleString("ru-RU")}</span>
                  ) : null}
                  {isSent && result?.telegramMessageId && (
                    <a href={tgMessageLink(channel.telegramId, result.telegramMessageId)} target="_blank" rel="noopener noreferrer" className="text-blue-500 flex items-center gap-0.5">
                      <ExternalLink className="size-3" /> TG
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Канал</TableHead>
              <TableHead>Telegram</TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  Просмотры
                </span>
              </TableHead>
              <TableHead>Статус отправки</TableHead>
              <TableHead>Ссылка на пост</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targetChannels.map((channel) => {
              const result = campaign.channelResults?.[channel.id];
              const isSent = result?.status === "sent";
              const isFailed = result?.status === "failed";

              return (
                <TableRow key={channel.id}>
                  <TableCell>
                    <Link
                      to={`/channels/${channel.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {channel.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <a
                      href={tgChannelLink(channel.telegramId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                    >
                      {channel.telegramId}
                      <ExternalLink className="size-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {isSent && result?.viewsCount ? (
                      <span className="text-sm font-medium text-gray-900">
                        {result.viewsCount.toLocaleString("ru-RU")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSent && (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="size-4" />
                        <span className="text-sm">Отпра��лено</span>
                      </div>
                    )}
                    {isFailed && (
                      <div className="flex items-center gap-1.5 text-red-600">
                        <XCircle className="size-4" />
                        <span className="text-sm" title={result?.error}>
                          {result?.error || "Ошибка"}
                        </span>
                      </div>
                    )}
                    {!isSent && !isFailed && (
                      <Badge variant="outline" className="text-xs">
                        Ожидание
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSent && result?.telegramMessageId ? (
                      <a
                        href={tgMessageLink(
                          channel.telegramId,
                          result.telegramMessageId
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                      >
                        Открыть в Telegram
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
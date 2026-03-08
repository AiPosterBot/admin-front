import { useState, useMemo } from "react";
import {
  Megaphone,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Calendar,
  Image as ImageIcon,
  User,
  FileText,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import {
  mockAdsPosts,
  createCampaign,
  type AdsCampaign,
} from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import { TagFilter } from "./TagFilter";
import { TagBadge } from "./TagBadge";
import * as channelService from "../services/channelService";
import * as teamService from "../services/teamService";

type Step = "name" | "post" | "channels" | "schedule";

const STEPS: Step[] = ["name", "post", "channels", "schedule"];
const STEP_LABELS: Record<Step, string> = {
  name: "Название",
  post: "Пост",
  channels: "Каналы",
  schedule: "Расписание",
};

const POSTS_PER_PAGE = 4;
const CHANNELS_PER_PAGE = 8;

interface AddCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (campaign: AdsCampaign) => void;
}

export function AddCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: AddCampaignDialogProps) {
  const { currentTeamId } = useTeam();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  // Pagination state
  const [postPage, setPostPage] = useState(1);
  const [channelPage, setChannelPage] = useState(1);
  const [channelTagFilter, setChannelTagFilter] = useState<string[]>([]);

  const teamPosts = useMemo(
    () =>
      mockAdsPosts
        .filter((p) => p.teamId === currentTeamId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [currentTeamId]
  );

  const teamChannels = useMemo(
    () => channelService.getTeamChannelsList(currentTeamId ?? "").filter(c => c.isActive && c.botCanPost),
    [currentTeamId]
  );

  const teamChannelTags = useMemo(
    () => channelService.getTeamChannelTags(currentTeamId ?? ""),
    [currentTeamId]
  );

  const filteredChannels = useMemo(() => {
    if (channelTagFilter.length === 0) return teamChannels;
    return teamChannels.filter(c => {
      const tags = channelService.getChannelTagsById(c.id);
      return tags.some(t => channelTagFilter.includes(t.id));
    });
  }, [teamChannels, channelTagFilter]);

  // Post pagination
  const totalPostPages = Math.max(1, Math.ceil(teamPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = teamPosts.slice(
    (postPage - 1) * POSTS_PER_PAGE,
    postPage * POSTS_PER_PAGE
  );

  // Channel pagination
  const totalChannelPages = Math.max(
    1,
    Math.ceil(filteredChannels.length / CHANNELS_PER_PAGE)
  );
  const paginatedChannels = filteredChannels.slice(
    (channelPage - 1) * CHANNELS_PER_PAGE,
    channelPage * CHANNELS_PER_PAGE
  );

  const currentStepIndex = STEPS.indexOf(step);
  const selectedPost = teamPosts.find((p) => p.id === selectedPostId);

  const handleReset = () => {
    setStep("name");
    setName("");
    setSelectedPostId(null);
    setSelectedChannels([]);
    setScheduleMode("now");
    setScheduleDate("");
    setScheduleTime("10:00");
    setPostPage(1);
    setChannelPage(1);
    setChannelTagFilter([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleAll = () => {
    if (selectedChannels.length === filteredChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(filteredChannels.map((c) => c.id));
    }
  };

  const handleNext = () => {
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
  };

  const handleBack = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case "name":
        return name.trim().length > 0;
      case "post":
        return selectedPostId !== null;
      case "channels":
        return selectedChannels.length > 0;
      case "schedule":
        return scheduleMode === "now" || (scheduleDate && scheduleTime);
      default:
        return false;
    }
  };

  const handleCreate = () => {
    if (!selectedPostId) return;

    let scheduledAt: string | undefined;
    if (scheduleMode === "scheduled" && scheduleDate && scheduleTime) {
      scheduledAt = new Date(
        `${scheduleDate}T${scheduleTime}:00`
      ).toISOString();
    }

    const campaign = createCampaign({
      name: name.trim(),
      adsPostId: selectedPostId,
      targetChannels: selectedChannels,
      scheduledAt,
    });

    toast.success(`Кампания «${campaign.name}» создана`);
    onCreated(campaign);
    handleClose();
  };

  /** Helper to get tg link for channel */
  const channelTgLink = (telegramId: string) => {
    const username = telegramId.replace("@", "");
    return `https://t.me/${username}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-blue-600" />
            {step === "name" && "Новая кампания"}
            {step === "post" && "Выбор поста"}
            {step === "channels" && "Выбор каналов"}
            {step === "schedule" && "Расписание отправки"}
          </DialogTitle>
          <DialogDescription>
            {step === "name" && "Введите название рекламной кампании"}
            {step === "post" && "Выберите рекламный пост для рассылки"}
            {step === "channels" && "Выберите каналы для рассылки"}
            {step === "schedule" &&
              "Время устанавливается исходя из часового пояса вашего профиля"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : idx < currentStepIndex
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {idx < currentStepIndex ? (
                  <CheckCircle className="size-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-5 transition-colors ${
                    idx < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {STEP_LABELS[step]}
          </span>
        </div>

        {/* Step 1: Name */}
        {step === "name" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="mb-2 block">
                Название кампании
              </Label>
              <Input
                id="campaign-name"
                placeholder="Например: Весенняя акция"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canGoNext()) handleNext();
                }}
                autoFocus
              />
              <p className="text-xs text-gray-400">
                Название будет видно только вам — используйте понятное описание
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button onClick={handleNext} disabled={!canGoNext()}>
                Далее <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select post */}
        {step === "post" && (
          <div className="space-y-4">
            {teamPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="size-8 text-gray-300 mx-auto mb-2" />
                <div className="font-medium">Нет доступных постов</div>
                <p className="text-sm mt-1">
                  Сначала создайте рекламный пост: отправьте сообщение боту и
                  ответьте на него командой{" "}
                  <code className="bg-gray-100 px-1 rounded">/ads</code>
                </p>
              </div>
            ) : (
              <>
                <div className="max-h-[320px] overflow-y-auto border rounded-lg divide-y">
                  {paginatedPosts.map((post) => {
                    const isSelected = selectedPostId === post.id;
                    return (
                      <label
                        key={post.id}
                        className={`flex gap-3 p-3 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="ads-post"
                          checked={isSelected}
                          onChange={() => setSelectedPostId(post.id)}
                          className="accent-blue-600 mt-1 flex-shrink-0"
                        />
                        {post.mediaUrl && (
                          <img
                            src={post.mediaUrl}
                            alt=""
                            className="w-14 h-14 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 line-clamp-2">
                            {post.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <User className="size-3" />
                              {post.createdByName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )}
                            </span>
                            {post.mediaUrl && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <ImageIcon className="size-3" />
                              </span>
                            )}
                            {post.usedInCampaigns.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-xs py-0"
                              >
                                {post.usedInCampaigns.length} кампан.
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Post pagination */}
                {totalPostPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {teamPosts.length} постов · стр. {postPage} из{" "}
                      {totalPostPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                        disabled={postPage === 1}
                        className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      <button
                        onClick={() =>
                          setPostPage((p) => Math.min(totalPostPages, p + 1))
                        }
                        disabled={postPage === totalPostPages}
                        className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-1.5" />
                Назад
              </Button>
              <Button onClick={handleNext} disabled={!canGoNext()}>
                Далее <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Channels */}
        {step === "channels" && (
          <div className="space-y-4">
            {teamChannels.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Megaphone className="size-8 text-gray-300 mx-auto mb-2" />
                <div className="font-medium">Нет активных каналов</div>
                <p className="text-sm mt-1">
                  Сначала добавьте хотя бы один активный канал
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Выбрано: {selectedChannels.length} из{" "}
                      {teamChannels.length}
                    </span>
                    {teamChannelTags.length > 0 && (
                      <TagFilter
                        tags={teamChannelTags}
                        selectedTagIds={channelTagFilter}
                        onChange={(ids) => { setChannelTagFilter(ids); setChannelPage(1); }}
                      />
                    )}
                  </div>
                  <button
                    onClick={toggleAll}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {selectedChannels.length === filteredChannels.length
                      ? "Снять все"
                      : "Выбрать все"}
                  </button>
                </div>

                <div className="max-h-[280px] overflow-y-auto border rounded-lg divide-y">
                  {paginatedChannels.map((channel) => {
                    const isSelected = selectedChannels.includes(channel.id);
                    const username = channel.telegramId.replace("@", "");
                    return (
                      <label
                        key={channel.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {channel.name}
                          </div>
                          <a
                            href={channelTgLink(channel.telegramId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {channel.telegramId}
                          </a>
                          {(() => {
                            const tags = channelService.getChannelTagsById(channel.id);
                            return tags.length > 0 ? (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {tags.map(t => (
                                  <TagBadge key={t.id} name={t.name} color={t.color} />
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div
                          className={`size-2 rounded-full flex-shrink-0 ${
                            channel.lastError
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                        />
                      </label>
                    );
                  })}
                </div>

                {/* Channel pagination */}
                {totalChannelPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {filteredChannels.length} каналов · стр. {channelPage} из{" "}
                      {totalChannelPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setChannelPage((p) => Math.max(1, p - 1))
                        }
                        disabled={channelPage === 1}
                        className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      <button
                        onClick={() =>
                          setChannelPage((p) =>
                            Math.min(totalChannelPages, p + 1)
                          )
                        }
                        disabled={channelPage === totalChannelPages}
                        className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-1.5" />
                Назад
              </Button>
              <Button onClick={handleNext} disabled={!canGoNext()}>
                Далее <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Schedule + confirm */}
        {step === "schedule" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 border rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Кампания</span>
                <span className="font-medium text-gray-900">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Пост</span>
                <span className="font-medium text-gray-900 truncate max-w-[250px] text-right">
                  {selectedPost?.text.split("\n")[0].slice(0, 40)}
                  {(selectedPost?.text.split("\n")[0].length || 0) > 40
                    ? "..."
                    : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Каналов</span>
                <span className="font-medium text-gray-900">
                  {selectedChannels.length}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  scheduleMode === "now"
                    ? "border-blue-300 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                  className="accent-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Отправить сразу
                  </div>
                  <div className="text-xs text-gray-500">
                    Рассылка начнётся немедленно после создания кампании
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  scheduleMode === "scheduled"
                    ? "border-blue-300 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "scheduled"}
                  onChange={() => setScheduleMode("scheduled")}
                  className="accent-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Запланировать
                  </div>
                  <div className="text-xs text-gray-500">
                    Укажите дату и время отправки
                  </div>
                </div>
              </label>
            </div>

            {scheduleMode === "scheduled" && (
              <div className="flex gap-3 pl-9">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="sched-date" className="text-xs">
                    Дата
                  </Label>
                  <Input
                    id="sched-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="w-28 space-y-1.5">
                  <Label htmlFor="sched-time" className="text-xs">
                    Время
                  </Label>
                  <Input
                    id="sched-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {scheduleMode === "scheduled" && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-9">
                <Info className="size-3" />
                Время устанавливается в часовом поясе вашего профиля
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-1.5" />
                Назад
              </Button>
              <Button onClick={handleCreate} disabled={!canGoNext()}>
                <Megaphone className="size-4 mr-2" />
                Создать кампанию
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
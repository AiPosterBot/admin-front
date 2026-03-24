import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Save, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import { useTeam } from "../context/TeamContext";
import { TeamLimitsDisplay } from "../components/TeamLimitsCard";
import { apiDelete, apiGet, apiPatch } from "../lib/api";
import { useTeamPermissions } from "../lib/rbac";

interface TeamDetailsResponse {
  team: { id: string; name: string; isActive: boolean; createdAt: string; updatedAt: string };
  limits: {
    maxPostsPerDay: number;
    maxChannels: number;
    maxSources: number;
    maxAgentRuns: number;
    maxMembers: number;
  };
  myRole: "owner" | "member";
  stats: {
    channels: number;
    sources: number;
    items24h: number;
    posts24h: number;
  };
  usage: {
    postsToday: number;
    postsResetAtUtc: string;
    agentRunsThisMonth: number;
    agentRunsResetAtUtc: string;
  };
}

interface MembersResponse {
  data: Array<{ userId: string; role: "owner" | "member"; displayName: string; email: string; joinedAt: string }>;
  total: number;
}

interface InvitationsResponse {
  data: Array<{ id: string; status: "pending" | "accepted" | "cancelled" }>;
}

export function TeamSettingsPage() {
  const { currentTeamId, currentTeam, refreshTeams } = useTeam();
  const { isOwner } = useTeamPermissions();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState("");
  const [teamDetails, setTeamDetails] = useState<TeamDetailsResponse | null>(null);
  const [membersCount, setMembersCount] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!currentTeamId) {
        return;
      }

      try {
        const [teamResponse, membersResponse, invitationsResponse] = await Promise.all([
          apiGet<TeamDetailsResponse>(`/api/teams/${currentTeamId}`),
          apiGet<MembersResponse>(`/api/teams/${currentTeamId}/members?page=1&limit=100`),
          apiGet<InvitationsResponse>(`/api/teams/${currentTeamId}/invitations?page=1&limit=100&status=pending`),
        ]);

        if (!isMounted) {
          return;
        }

        setTeamDetails(teamResponse);
        setTeamName(teamResponse.team.name);
        setMembersCount(membersResponse.data.length);
        setPendingInvitesCount(invitationsResponse.data.length);
      } catch (error: any) {
        if (isMounted) {
          toast.error(error.message || "Не удалось загрузить настройки команды");
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [currentTeamId]);

  const usage = useMemo(() => ({
    postsToday: teamDetails?.usage.postsToday ?? 0,
    postsResetAtUtc: teamDetails?.usage.postsResetAtUtc ?? null,
    agentRunsThisMonth: teamDetails?.usage.agentRunsThisMonth ?? 0,
    agentRunsResetAtUtc: teamDetails?.usage.agentRunsResetAtUtc ?? null,
    sourcesUsed: teamDetails?.stats.sources ?? 0,
    channelsUsed: teamDetails?.stats.channels ?? 0,
    membersUsed: membersCount + pendingInvitesCount,
  }), [membersCount, pendingInvitesCount, teamDetails]);

  if (!currentTeamId || !currentTeam || !teamDetails) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Команда не выбрана</h2>
        <p className="text-muted-foreground">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  const deleteMessages = (() => {
    if (teamDetails.stats.channels > 0) {
      return { canDelete: false, reason: "Сначала удалите каналы команды" };
    }
    if (teamDetails.stats.sources > 0) {
      return { canDelete: false, reason: "Сначала удалите источники команды" };
    }
    if (membersCount > 1) {
      return { canDelete: false, reason: "Сначала удалите всех участников кроме владельца" };
    }
    if (pendingInvitesCount > 0) {
      return { canDelete: false, reason: "Сначала отмените ожидающие приглашения" };
    }
    return { canDelete: true, reason: "Команду можно удалить" };
  })();

  const createdAtLabel = new Date(teamDetails.team.createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiPatch(`/api/teams/${currentTeamId}`, { name: teamName });
      await refreshTeams();
      setTeamDetails((state) => state ? {
        ...state,
        team: {
          ...state.team,
          name: teamName,
        },
      } : state);
      toast.success("Настройки команды сохранены");
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить настройки команды");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiDelete(`/api/teams/${currentTeamId}`);
      await refreshTeams();
      toast.success(`Команда "${teamDetails.team.name}" удалена`);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить команду");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Настройки команды</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{teamDetails.team.name}</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-xs shadow-sm sm:self-auto">
          <span className="font-medium text-foreground/80">Создана</span>
          <span className="tabular-nums text-muted-foreground">{createdAtLabel}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName" className="mb-2 block">Название команды</Label>
            <Input id="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} disabled={!isOwner || isSaving} />
          </div>

          <Button onClick={() => void handleSave()} disabled={!isOwner || isSaving || !teamName.trim()}>
            <Save className="mr-2 size-4" />
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Лимиты команды</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamLimitsDisplay limits={teamDetails.limits} usage={usage} />
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="overflow-hidden border-red-200/70 bg-gradient-to-br from-red-50/70 via-background to-background dark:border-red-900/50 dark:from-red-950/20 dark:via-background dark:to-background">
          <CardHeader className="border-b border-red-200/60 pb-4 dark:border-red-900/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <ShieldAlert className="size-4" />
                  Опасная зона
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Необратимые действия
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-4 rounded-xl border border-red-200/70 bg-background/80 p-4 shadow-sm dark:border-red-900/40 dark:bg-background/50 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Удалить команду</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    После удаления настройки команды и доступ к ней нельзя будет восстановить.
                  </div>
                </div>
                <div className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${
                  deleteMessages.canDelete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                }`}>
                  {deleteMessages.reason}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="min-w-32" disabled={!deleteMessages.canDelete || isDeleting}>
                    <Trash2 className="mr-2 size-4" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить команду?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы уверены, что хотите удалить команду "{teamDetails.team.name}"? Это действие необратимо.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()} className="bg-red-600 hover:bg-red-700">
                      Удалить команду
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

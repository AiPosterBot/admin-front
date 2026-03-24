import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { NumericInput } from "../components/ui/numeric-input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { UserAvatar } from "../components/UserAvatar";
import { ApiError } from "../lib/api";
import { getAdminUser, updateAdminUserActive, updateAdminUserLimits, type AdminUserDetail } from "../services/adminService";

export function UserDetailPage() {
  const { userId } = useParams();
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [pageState, setPageState] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [canCreateTeam, setCanCreateTeam] = useState(false);
  const [maxTeams, setMaxTeams] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!userId) {
        if (isMounted) {
          setPageState("not_found");
        }
        return;
      }

      setPageState("loading");
      try {
        const response = await getAdminUser(userId);
        if (!isMounted) {
          return;
        }
        setUserDetail(response);
        setCanCreateTeam(response.user.canCreateTeam);
        setMaxTeams(response.user.maxTeams);
        setPageState("ready");
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setUserDetail(null);
          setPageState("not_found");
          return;
        }

        setPageState("error");
        toast.error(error.message || "Не удалось загрузить пользователя");
      }
    }

    void loadUser();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (pageState === "loading") {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Загрузка пользователя</h2>
        <p className="mb-4 text-muted-foreground">Получаем данные пользователя и его команд.</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Не удалось загрузить пользователя</h2>
        <p className="mb-4 text-muted-foreground">Страница не смогла получить данные. Попробуйте обновить ее еще раз.</p>
        <Link to="/admin/users">
          <Button>Вернуться к пользователям</Button>
        </Link>
      </div>
    );
  }

  if (pageState === "not_found" || !userDetail) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Пользователь не найден</h2>
        <p className="mb-4 text-muted-foreground">Пользователь, которого вы ищете, не существует.</p>
        <Link to="/admin/users">
          <Button>Вернуться к пользователям</Button>
        </Link>
      </div>
    );
  }

  const { user, teams, usage } = userDetail;
  const ownedTeams = teams.filter((team) => team.role === "owner");

  const handleSaveLimits = async () => {
    try {
      await updateAdminUserLimits(user.id, { canCreateTeam, maxTeams });
      setUserDetail((state) => state ? {
        ...state,
        user: {
          ...state.user,
          canCreateTeam,
          maxTeams,
        },
      } : state);
      toast.success("Права пользователя обновлены");
    } catch (error: any) {
      toast.error(error.message || "Не удалось обновить пользователя");
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateAdminUserActive(user.id, !user.isActive);
      setUserDetail((state) => state ? {
        ...state,
        user: {
          ...state.user,
          isActive: !state.user.isActive,
        },
      } : state);
      toast.success(user.isActive ? "Пользователь заблокирован" : "Пользователь разблокирован");
    } catch (error: any) {
      toast.error(error.message || "Не удалось изменить статус пользователя");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin/users" className="transition-colors hover:text-primary">Пользователи</Link>
        <span>/</span>
        <span>{user.displayName}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.displayName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user.displayName}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Badge variant={user.isActive ? "default" : "secondary"} className="px-4 py-2 text-sm">
          {user.isActive ? "Активен" : "Заблокирован"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Команды</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{teams.length}</div>
            <div className="text-xs text-muted-foreground">{ownedTeams.length} как владелец</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Дата создания</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-foreground">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Права на создание команд</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-medium text-foreground">Может создавать команды</div>
              <div className="text-sm text-muted-foreground">Разрешить пользователю создавать свои команды</div>
            </div>
            <Switch checked={canCreateTeam} onCheckedChange={setCanCreateTeam} />
          </div>

          {canCreateTeam ? (
            <div className="space-y-3 rounded-lg border p-4">
              <Label htmlFor="max-teams" className="mb-1 block">Максимум команд</Label>
              <NumericInput
                id="max-teams"
                min={0}
                max={100}
                value={maxTeams}
                fallbackValue={0}
                onValueChange={setMaxTeams}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Текущих: {ownedTeams.length} из {maxTeams}</p>
            </div>
          ) : null}

          <Button onClick={() => void handleSaveLimits()}>Сохранить изменения</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Активность аккаунта</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-medium text-foreground">
                {user.isActive ? "Аккаунт активен" : "Аккаунт заблокирован"}
              </div>
              <div className="text-sm text-muted-foreground">
                {user.isActive ? "Пользователь может входить в систему" : "Пользователь не может войти в систему"}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant={user.isActive ? "outline" : "default"}>
                  {user.isActive ? "Заблокировать" : "Разблокировать"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{user.isActive ? "Заблокировать" : "Разблокировать"} пользователя?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.isActive
                      ? `Пользователь ${user.displayName} (${user.email}) не сможет входить в систему.`
                      : `Пользователь ${user.displayName} (${user.email}) снова сможет входить.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleToggleActive()}>Подтвердить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Команды пользователя ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((membership) => (
                <div key={membership.id} className="flex flex-col items-start justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">{membership.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Добавлен {new Date(membership.joinedAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                  <Badge variant={membership.role === "owner" ? "default" : "secondary"}>
                    {membership.role === "owner" ? "Владелец" : "Участник"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Пользователь не состоит в командах</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Постов сегодня</div>
            <div className="text-2xl font-bold text-foreground">{usage.postsToday}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Agent runs в месяц</div>
            <div className="text-2xl font-bold text-foreground">{usage.agentRunsMonth}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { mockUsers, mockTeams, mockTeamMembers } from "../data/mock-data";
import { UserAvatar } from "../components/UserAvatar";

export function UserDetailPage() {
  const { userId } = useParams();
  const user = mockUsers.find((u) => u.id === userId);
  const [canCreateTeam, setCanCreateTeam] = useState(user?.canCreateTeam || false);
  const [maxTeams, setMaxTeams] = useState(user?.maxTeams || 0);

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Пользователь не найден</h2>
        <p className="text-gray-600 mb-4">Пользователь, которого вы ищете, не существует.</p>
        <Link to="/admin/users">
          <Button>Вернуться к пользователям</Button>
        </Link>
      </div>
    );
  }

  const userTeams = mockTeamMembers
    .filter((m) => m.userId === userId)
    .map((m) => {
      const team = mockTeams.find((t) => t.id === m.teamId);
      return { ...m, teamName: team?.name || "Unknown" };
    });

  const ownedTeams = mockTeams.filter(t => t.ownerId === userId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/admin/users" className="hover:text-blue-600">
          Пользователи
        </Link>
        <span>/</span>
        <span>{user.displayName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.displayName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>
        <Badge variant={user.isActive ? "default" : "secondary"} className="text-sm px-4 py-2">
          {user.isActive ? "Активен" : "Заблокирован"}
        </Badge>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Команды</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{userTeams.length}</div>
            <div className="text-xs text-gray-500">{ownedTeams.length} как владелец</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Дата создания</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('ru-RU')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Последняя активность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-900">
              {new Date(user.lastActive).toLocaleDateString('ru-RU')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team creation permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Права на создание команд</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Может создавать команды</div>
              <div className="text-sm text-gray-500">
                Разрешить пользователю создавать свои команды
              </div>
            </div>
            <Switch
              checked={canCreateTeam}
              onCheckedChange={setCanCreateTeam}
            />
          </div>

          {canCreateTeam && (
            <div className="p-4 border rounded-lg space-y-3">
              <Label htmlFor="max-teams" className="mb-1 block">Максимум команд</Label>
              <Input
                id="max-teams"
                type="number"
                min={1}
                max={100}
                value={maxTeams}
                onChange={(e) => setMaxTeams(Number(e.target.value))}
                className="w-32"
              />
              <p className="text-xs text-gray-500">
                Текущих: {ownedTeams.length} из {maxTeams}
              </p>
            </div>
          )}

          <Button>Сохранить изменения</Button>
        </CardContent>
      </Card>

      {/* Active status */}
      <Card>
        <CardHeader>
          <CardTitle>Активность аккаунта</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg">
            <div>
              <div className="font-medium text-gray-900">
                {user.isActive ? "Аккаунт активен" : "Аккаунт заблокирован"}
              </div>
              <div className="text-sm text-gray-500">
                {user.isActive
                  ? "Пользователь может входить в систему"
                  : "Пользователь не может войти в систему"}
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
                  <AlertDialogTitle>
                    {user.isActive ? "Заблокировать" : "Разблокировать"} пользователя?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.isActive
                      ? `Пользователь ${user.displayName} (${user.email}) не сможет входить в систему.`
                      : `Пользователь ${user.displayName} (${user.email}) снова сможет входить.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction>Подтвердить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Teams */}
      <Card>
        <CardHeader>
          <CardTitle>Команды пользователя ({userTeams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {userTeams.length > 0 ? (
            <div className="space-y-2">
              {userTeams.map((membership) => (
                <div key={membership.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">
                        {membership.teamName[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{membership.teamName}</div>
                      <div className="text-xs text-gray-500">
                        Добавлен {new Date(membership.createdAt).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>
                  <Badge variant={membership.role === "owner" ? "default" : "secondary"}>
                    {membership.role === "owner" ? "Владелец" : "Участник"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">Пользователь не состоит в командах</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
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
import { getCurrentUser, canDeleteTeam, getTeamUsage, deleteTeam } from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import { TeamLimitsDisplay } from "../components/TeamLimitsCard";
import * as teamService from "../services/teamService";

export function TeamSettingsPage() {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const team = teamService.getTeamById(currentTeamId);
  const [teamName, setTeamName] = useState(team?.name || "");
  const usage = currentTeamId ? getTeamUsage(currentTeamId) : null;

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  const deleteCheck = canDeleteTeam(team.id);
  const isOwner = currentUser ? team.ownerId === currentUser.id : false;

  const handleDelete = () => {
    deleteTeam(team.id);
    toast.success(`Команда "${team.name}" удалена`);
    // Delay navigate so Radix AlertDialog portal can unmount cleanly
    setTimeout(() => navigate("/"), 0);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки команды</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {team.name}
        </p>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName" className="mb-2 block">Название команды</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Владелец</Label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
              <div className="size-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                {team.ownerName[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{team.ownerName}</div>
                <div className="text-xs text-gray-500">Владелец команды</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Дата создания</Label>
            <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border">
              {new Date(team.createdAt).toLocaleString("ru-RU")}
            </div>
          </div>

          <Button onClick={() => {
            if (team) {
              team.name = teamName;
              toast.success("Настройки команды сохранены");
            }
          }}>
            <Save className="size-4 mr-2" />
            Сохранить изменения
          </Button>
        </CardContent>
      </Card>

      {/* Team Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Л��миты команды</CardTitle>
        </CardHeader>
        <CardContent>
          {usage && (
            <TeamLimitsDisplay limits={team.limits} usage={usage} />
          )}
          <p className="text-xs text-gray-400 mt-4">
            Лимиты устанавливаются глобальным администратором
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Опасная зона</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border border-red-300 rounded-lg bg-red-50">
              <div>
                <div className="font-medium text-red-900 text-sm">Удалить команду</div>
                <div className="text-xs text-red-700 mt-0.5">
                  {deleteCheck.canDelete
                    ? "Команду можно удалить. Это действие необратимо."
                    : deleteCheck.reason}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!deleteCheck.canDelete}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить команду?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы уверены, что хотите удалить команду "{team.name}"?
                      Это действие необратимо — все данные будут потеряны.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Удалить команду
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
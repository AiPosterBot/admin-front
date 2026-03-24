import { useEffect, useState } from "react";
import { Activity, Edit, Radio, Rss, Save, Search, Users, X } from "lucide-react";
import { Input } from "../components/ui/input";
import { NumericInput } from "../components/ui/numeric-input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { TeamLimitsDisplay } from "../components/TeamLimitsCard";
import { getAdminTeam, getAdminTeams, updateAdminTeamLimits, type AdminTeamDetail, type AdminTeamListItem } from "../services/adminService";
import { getChannelPublishModeLabel } from "../services/channelService";

export function AdminTeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<AdminTeamListItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<AdminTeamDetail | null>(null);
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [editLimits, setEditLimits] = useState({
    maxPostsPerDay: 0,
    maxChannels: 0,
    maxSources: 0,
    maxAgentRuns: 0,
    maxMembers: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      try {
        const data = await getAdminTeams(searchQuery);
        if (!isMounted) {
          return;
        }
        setTeams(data);
        if (!selectedTeamId && data.length > 0) {
          setSelectedTeamId(data[0].id);
        }
      } catch {
        if (isMounted) {
          setTeams([]);
        }
      }
    }

    void loadTeams();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedTeamId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedTeam() {
      if (!selectedTeamId) {
        return;
      }

      try {
        const data = await getAdminTeam(selectedTeamId);
        if (!isMounted) {
          return;
        }
        setSelectedTeam(data);
      } catch {
        if (isMounted) {
          setSelectedTeam(null);
        }
      }
    }

    void loadSelectedTeam();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Все команды</h1>
        <p className="text-muted-foreground">Просмотр и управление всеми командами в системе</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск команд..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Все команды ({teams.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] space-y-2 overflow-y-auto">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedTeamId === team.id ? "border-primary/50 bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="mb-2 font-medium text-foreground">{team.name}</div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{team.channelsCount} ch</span>
                      <span>•</span>
                      <span>{team.sourcesCount} src</span>
                      <span>•</span>
                      <span>{team.membersCount} members</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedTeam.team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{selectedTeam.channels.length}</div>
                      <div className="text-sm text-muted-foreground">Каналов</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-900">{selectedTeam.sources.length}</div>
                      <div className="text-sm text-muted-foreground">Источников</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-900">{selectedTeam.members.length}</div>
                      <div className="text-sm text-muted-foreground">Участников</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                    <CardTitle>Лимиты команды</CardTitle>
                    {!isEditingLimits ? (
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditLimits({ ...selectedTeam.limits });
                        setIsEditingLimits(true);
                      }}>
                        <Edit className="mr-2 size-4" />
                        Изменить
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async () => {
                          await updateAdminTeamLimits(selectedTeam.team.id, editLimits);
                          setSelectedTeam((state) => state ? { ...state, limits: editLimits } : state);
                          setIsEditingLimits(false);
                        }}>
                          <Save className="mr-2 size-4" />
                          Сохранить
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditingLimits(false)}>
                          <X className="mr-2 size-4" />
                          Отмена
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingLimits ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="mb-2 block">Постов в день</Label>
                        <NumericInput min={0} value={editLimits.maxPostsPerDay} fallbackValue={0} onValueChange={(value) => setEditLimits({ ...editLimits, maxPostsPerDay: value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Каналов</Label>
                        <NumericInput min={0} value={editLimits.maxChannels} fallbackValue={0} onValueChange={(value) => setEditLimits({ ...editLimits, maxChannels: value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Источников</Label>
                        <NumericInput min={0} value={editLimits.maxSources} fallbackValue={0} onValueChange={(value) => setEditLimits({ ...editLimits, maxSources: value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Запусков агента в месяц</Label>
                        <NumericInput min={0} value={editLimits.maxAgentRuns} fallbackValue={0} onValueChange={(value) => setEditLimits({ ...editLimits, maxAgentRuns: value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Участников</Label>
                        <NumericInput min={0} value={editLimits.maxMembers} fallbackValue={0} onValueChange={(value) => setEditLimits({ ...editLimits, maxMembers: value })} />
                      </div>
                    </div>
                  ) : (
                    <TeamLimitsDisplay
                      limits={selectedTeam.limits}
                      usage={{
                        postsToday: selectedTeam.usage.postsToday,
                        postsResetAtUtc: selectedTeam.usage.postsResetAtUtc,
                        agentRunsThisMonth: selectedTeam.usage.agentRunsThisMonth,
                        agentRunsResetAtUtc: selectedTeam.usage.agentRunsResetAtUtc,
                        sourcesUsed: selectedTeam.sources.length,
                        channelsUsed: selectedTeam.channels.length,
                        membersUsed: selectedTeam.members.length,
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-blue-600" />
                    <CardTitle>Участники ({selectedTeam.members.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div key={member.userId} className="flex items-center justify-between rounded bg-muted/50 p-2">
                        <div>
                          <div className="text-sm font-medium">{member.displayName}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                        <Badge variant={member.role === "owner" ? "default" : "secondary"} className="text-xs">
                          {member.role === "owner" ? "Владелец" : "Участник"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Radio className="size-5 text-green-600" />
                    <CardTitle>Каналы ({selectedTeam.channels.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTeam.channels.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Каналы не настроены</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeam.channels.map((channel) => (
                        <div key={channel.id} className="flex items-center justify-between rounded bg-muted/50 p-2">
                          <div>
                            <div className="text-sm font-medium">{channel.name}</div>
                            <div className="text-xs text-muted-foreground">{channel.telegramUsername ? `@${channel.telegramUsername}` : channel.telegramTarget}</div>
                          </div>
                          <Badge
                            variant={channel.publishMode === "scheduled" ? "secondary" : channel.publishMode === "every_material" ? "outline" : "default"}
                            className="text-xs"
                          >
                            {getChannelPublishModeLabel(channel.publishMode as "periodic" | "scheduled" | "every_material")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Rss className="size-5 text-purple-600" />
                    <CardTitle>Источники ({selectedTeam.sources.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTeam.sources.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Источники не настроены</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeam.sources.map((source) => (
                        <div key={source.id} className="flex items-center justify-between rounded bg-muted/50 p-2">
                          <div>
                            <div className="text-sm font-medium">{source.name}</div>
                            <div className="text-xs text-muted-foreground">{source.type}</div>
                          </div>
                          <Badge variant={source.status === "ok" ? "default" : "destructive"} className="text-xs">
                            {source.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Выберите команду из списка для просмотра деталей
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router";
import { Search, Users, Radio, Rss, Edit, Save, X } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { mockTeams, mockChannels, mockSources, mockTeamMembers, getTeamUsage } from "../data/mock-data";
import { TeamLimitsDisplay } from "../components/TeamLimitsCard";

export function AdminTeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    mockTeams[0]?.id || null
  );
  const [teams, setTeams] = useState(mockTeams);
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [editLimits, setEditLimits] = useState({
    maxPostsPerDay: 0,
    maxChannels: 0,
    maxSources: 0,
    maxAgentRuns: 0,
    maxMembers: 0,
  });

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamChannels = selectedTeam
    ? mockChannels.filter((c) => c.teamId === selectedTeam.id)
    : [];
  const teamSources = selectedTeam
    ? mockSources.filter((s) => s.teamId === selectedTeam.id)
    : [];
  const teamMembers = selectedTeam
    ? mockTeamMembers.filter((m) => m.teamId === selectedTeam.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Все команды (Глобальный контур)</h1>
        <p className="text-gray-600">Просмотр и управление всеми командами в системе</p>
      </div>

      {/* Search & Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Поиск команд..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Все команды ({filteredTeams.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTeamId === team.id
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-2">{team.name}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>Owner: {team.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{team.channelsCount} ch</span>
                      <span>•</span>
                      <span>{team.sourcesCount} src</span>
                      <span>•</span>
                      <span>{team.membersCount} members</span>
                    </div>
                    {team.lastError && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Has Errors
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Inspector */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="space-y-4">
              {/* Team Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle>{selectedTeam.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Владелец: {selectedTeam.ownerName} • Создана{" "}
                        {new Date(selectedTeam.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <Link to={`/admin/teams`}>
                      <Badge variant="outline" className="cursor-pointer">
                        Все команды →
                      </Badge>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {selectedTeam.channelsCount}
                      </div>
                      <div className="text-sm text-gray-600">Каналов</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-900">
                        {selectedTeam.sourcesCount}
                      </div>
                      <div className="text-sm text-gray-600">Источников</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {selectedTeam.membersCount}
                      </div>
                      <div className="text-sm text-gray-600">Участников</div>
                    </div>
                  </div>
                  {selectedTeam.lastError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-900">
                      <strong>Ошибка:</strong> {selectedTeam.lastError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Team Limits */}
              <Card>
                <CardHeader>
                  <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                    <CardTitle>Лимиты команды</CardTitle>
                    {!isEditingLimits ? (
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditLimits({ ...selectedTeam.limits });
                        setIsEditingLimits(true);
                      }}>
                        <Edit className="size-4 mr-2" />
                        Изменить
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => {
                          setTeams(teams.map(t =>
                            t.id === selectedTeam.id ? { ...t, limits: editLimits } : t
                          ));
                          setIsEditingLimits(false);
                        }}>
                          <Save className="size-4 mr-2" />
                          Сохранить
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditingLimits(false)}>
                          <X className="size-4 mr-2" />
                          Отмена
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingLimits ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="mb-2 block">Постов в день</Label>
                        <Input
                          type="number"
                          value={editLimits.maxPostsPerDay}
                          onChange={(e) => setEditLimits({ ...editLimits, maxPostsPerDay: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Каналов</Label>
                        <Input
                          type="number"
                          value={editLimits.maxChannels}
                          onChange={(e) => setEditLimits({ ...editLimits, maxChannels: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Источников</Label>
                        <Input
                          type="number"
                          value={editLimits.maxSources}
                          onChange={(e) => setEditLimits({ ...editLimits, maxSources: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Агент парсинга</Label>
                        <Input
                          type="number"
                          value={editLimits.maxAgentRuns}
                          onChange={(e) => setEditLimits({ ...editLimits, maxAgentRuns: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="mb-2 block">Участников</Label>
                        <Input
                          type="number"
                          value={editLimits.maxMembers}
                          onChange={(e) => setEditLimits({ ...editLimits, maxMembers: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  ) : (
                    <TeamLimitsDisplay limits={selectedTeam.limits} usage={getTeamUsage(selectedTeam.id)} />
                  )}
                </CardContent>
              </Card>

              {/* Members */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-blue-600" />
                    <CardTitle>Участники ({teamMembers.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                            {member.userName[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{member.userName}</div>
                            <div className="text-xs text-gray-500 capitalize">
                              {member.role === 'owner' ? 'Владелец' : 'Участник'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Channels */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Radio className="size-5 text-green-600" />
                    <CardTitle>Каналы ({teamChannels.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamChannels.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Каналы не настроены
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teamChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between p-2 rounded bg-gray-50"
                        >
                          <div>
                            <div className="font-medium text-sm">{channel.name}</div>
                            <div className="text-xs text-gray-500">
                              <a
                                href={`https://t.me/${channel.telegramId.replace("@", "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600"
                              >
                                {channel.telegramId}
                              </a>
                            </div>
                          </div>
                          <Badge
                            variant={
                              channel.publishMode === "instant"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {channel.publishMode}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sources */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Rss className="size-5 text-purple-600" />
                    <CardTitle>Источники ({teamSources.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamSources.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Источники не настроены
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teamSources.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-center justify-between p-2 rounded bg-gray-50"
                        >
                          <div>
                            <div className="font-medium text-sm">{source.name}</div>
                            <div className="text-xs text-gray-500 capitalize">
                              {source.type}
                            </div>
                          </div>
                          <Badge
                            variant={
                              source.status === "ok"
                                ? "default"
                                : source.status === "error"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
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
              <CardContent className="py-12 text-center text-gray-500">
                Выберите команду из списка для просмотра деталей
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
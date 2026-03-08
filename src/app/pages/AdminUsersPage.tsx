import { useState } from "react";
import { Link } from "react-router";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { UserAvatar } from "../components/UserAvatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { mockUsers, mockTeamMembers, mockTeams } from "../data/mock-data";

export function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users] = useState(mockUsers);

  const filteredUsers = users.filter((user) =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserTeamsCount = (userId: string) => {
    return mockTeamMembers.filter(m => m.userId === userId).length;
  };

  const getUserOwnedTeams = (userId: string) => {
    return mockTeams.filter(t => t.ownerId === userId).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
        <p className="text-gray-500 text-sm mt-0.5">Управление аккаунтами пользователей</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users — Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => {
          const teamsCount = getUserTeamsCount(user.id);
          const ownedCount = getUserOwnedTeams(user.id);
          return (
            <Link key={user.id} to={`/admin/users/${user.id}`}>
              <div className="bg-white rounded-lg border p-4 active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar name={user.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{user.displayName}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  <ChevronRight className="size-4 text-gray-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!user.isActive && (
                    <Badge variant="secondary" className="text-xs">Заблокирован</Badge>
                  )}
                  {user.canCreateTeam ? (
                    <Badge variant="default" className="text-xs">
                      Команды: {ownedCount}/{user.maxTeams}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Без команд</Badge>
                  )}
                  <span className="text-xs text-gray-400">{teamsCount} команд</span>
                  <span className="text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Users Table — Desktop */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Может создавать команды</TableHead>
              <TableHead>Команды</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const teamsCount = getUserTeamsCount(user.id);
              const ownedCount = getUserOwnedTeams(user.id);
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.displayName} />
                      <div>
                        <div className="font-medium text-gray-900">{user.displayName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      {!user.isActive && (
                        <Badge variant="secondary" className="text-xs">Заблокирован</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.canCreateTeam ? (
                      <Badge variant="default" className="text-xs">
                        Да ({ownedCount}/{user.maxTeams})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Нет</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">{teamsCount}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link to={`/admin/users/${user.id}`}>
                      <button className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                        <ChevronRight className="size-4 text-gray-400" />
                      </button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1">Всего пользователей</div>
          <div className="text-2xl font-bold text-blue-900">{users.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">Активные</div>
          <div className="text-2xl font-bold text-green-900">
            {users.filter((u) => u.isActive).length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-700 mb-1">Могут создавать команды</div>
          <div className="text-2xl font-bold text-purple-900">
            {users.filter((u) => u.canCreateTeam).length}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700 mb-1">Заблокированные</div>
          <div className="text-2xl font-bold text-red-900">
            {users.filter((u) => !u.isActive).length}
          </div>
        </div>
      </div>
    </div>
  );
}
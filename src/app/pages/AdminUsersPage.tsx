import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { UserAvatar } from "../components/UserAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { getAdminUsers, type AdminUserListItem } from "../services/adminService";

export function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const nextUsers = await getAdminUsers(searchQuery);
        if (isMounted) {
          setUsers(nextUsers);
        }
      } catch {
        if (isMounted) {
          setUsers([]);
        }
      }
    }

    void loadUsers();
    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Пользователи</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Управление пользовательскими аккаунтами</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <Link key={user.id} to={`/admin/users/${user.id}`}>
            <div className="rounded-lg border border-border bg-card p-4 transition-colors active:bg-muted/40">
              <div className="mb-2 flex items-center gap-3">
                <UserAvatar name={user.displayName} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{user.displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!user.isActive ? <Badge variant="secondary" className="text-xs">Заблокирован</Badge> : null}
                {user.canCreateTeam ? (
                  <Badge variant="default" className="text-xs">Команды: {user.ownedTeamsCount}/{user.maxTeams}</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Без команд</Badge>
                )}
                <span className="text-xs text-muted-foreground">{user.teamsCount} команд</span>
                <span className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
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
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.displayName} />
                    <div>
                      <div className="font-medium text-foreground">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    {!user.isActive ? <Badge variant="secondary" className="text-xs">Заблокирован</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  {user.canCreateTeam ? (
                    <Badge variant="default" className="text-xs">Да ({user.ownedTeamsCount}/{user.maxTeams})</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Нет</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">{user.teamsCount}</span>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</div>
                </TableCell>
                <TableCell>
                  <Link to={`/admin/users/${user.id}`}>
                    <button className="rounded p-1.5 transition-colors hover:bg-muted">
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

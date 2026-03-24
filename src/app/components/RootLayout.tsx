import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Radio,
  Rss,
  FileText,
  Zap,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  UserCircle,
  Plus,
  Check,
  Clock,
  Mail,
  BrainCircuit,
  Send,
  Megaphone,
  Sun,
  Moon,
} from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useTeam } from "../context/TeamContext";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, isLoggedIn, isReady, logout } = useAuth();
  const { currentTeamId, currentTeam, teams, isLoading: isTeamLoading, setCurrentTeamId, createTeam } = useTeam();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isLoggedIn || !currentUser) {
      navigate("/login");
    }
  }, [currentUser, isLoggedIn, isReady, navigate]);

  useEffect(() => {
    if (!isReady || !isLoggedIn || !currentUser || isTeamLoading) {
      return;
    }

    if (teams.length === 0 && location.pathname !== "/onboarding" && currentUser.canCreateTeam) {
      navigate("/onboarding");
    }
  }, [currentUser, isLoggedIn, isReady, isTeamLoading, teams.length, location.pathname, navigate]);

  const canCreateMoreTeams = useMemo(() => {
    if (!currentUser?.canCreateTeam) {
      return false;
    }

    const ownedTeams = teams.filter((team) => team.myRole === "owner").length;
    return ownedTeams < (currentUser.maxTeams || 0);
  }, [currentUser, teams]);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      return;
    }

    setIsCreatingTeam(true);
    try {
      const team = await createTeam(newTeamName.trim());
      setCurrentTeamId(team.id);
      setNewTeamName("");
      setIsCreateTeamDialogOpen(false);
      navigate("/");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const navGroups = [
    [
      { path: "/", label: "Обзор", icon: LayoutDashboard },
      { path: "/channels", label: "Каналы", icon: Radio },
      { path: "/sources", label: "Источники", icon: Rss },
      { path: "/ads", label: "Кампании", icon: Megaphone },
    ],
    [
      { path: "/posts", label: "Публикации", icon: Send },
      { path: "/items", label: "Контент", icon: FileText },
      { path: "/jobs", label: "Задачи", icon: Zap },
      { path: "/llm-traces", label: "LLM трейсы", icon: BrainCircuit },
    ],
    [
      { path: "/members", label: "Участники", icon: Users },
      { path: "/settings", label: "Настройки", icon: Settings },
    ],
  ];

  if (!isReady || !currentUser || isTeamLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen((value) => !value)} className="lg:hidden">
              {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              AI Poster
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
                  <div className="flex size-6 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      {currentTeam?.name[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="hidden items-start sm:flex sm:flex-col">
                    <span className="text-sm font-medium leading-none">
                      {currentTeam?.name ?? "Выберите команду"}
                    </span>
                    <span className="mt-0.5 text-xs leading-none text-gray-400 dark:text-gray-500">команда</span>
                  </div>
                  <ChevronDown className="size-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  Переключить команду
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teams.map((team) => (
                  <DropdownMenuItem key={team.id} onClick={() => setCurrentTeamId(team.id)} className="flex items-center gap-3 py-2.5">
                    <div className="flex size-8 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{team.name[0]?.toUpperCase() ?? "?"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{team.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{team.myRole === "owner" ? "owner" : "member"}</div>
                    </div>
                    {currentTeamId === team.id ? <Check className="size-4 flex-shrink-0 text-blue-600 dark:text-blue-400" /> : null}
                  </DropdownMenuItem>
                ))}
                {canCreateMoreTeams ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCreateTeamDialogOpen(true)} className="gap-2 text-blue-600 dark:text-blue-400">
                      <Plus className="size-4" />
                      Создать новую команду
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={toggleTheme} className="size-9 p-0">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {currentUser.displayName[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="hidden items-start md:flex md:flex-col">
                    <span className="text-sm font-medium">{currentUser.displayName}</span>
                  </div>
                  <ChevronDown className="size-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-semibold">{currentUser.displayName}</div>
                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400">{currentUser.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="mr-2 size-4" />
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleLogout()} className="text-red-600">
                  <LogOut className="mr-2 size-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed left-0 top-[65px] z-30 flex h-[calc(100vh-65px)] w-56 flex-col border-r bg-white transition-transform dark:bg-gray-900 lg:translate-x-0`}
        >
          <nav className="flex-1 overflow-y-auto p-3">
            {currentTeam ? (
              <div>
                <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {currentTeam.name}
                </div>
                {navGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="space-y-0.5">
                      {group.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)}>
                            <div
                              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                                active
                                  ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                              }`}
                            >
                              <Icon className="size-4 flex-shrink-0" />
                              <span>{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    {groupIndex < navGroups.length - 1 ? <div className="my-2 border-t border-gray-100 dark:border-gray-800" /> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 lg:ml-56 lg:p-7">
          {teams.length === 0 && !currentUser.canCreateTeam ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <Clock className="size-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">Нет доступных команд</h2>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  У вас пока нет команд. Попросите владельца команды отправить приглашение или обратитесь к администратору.
                </p>
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <Mail className="mr-1.5 inline size-4" />
                  Проверьте почту — возможно приглашение уже отправлено.
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      ) : null}

      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать новую команду</DialogTitle>
            <DialogDescription>
              Каждая команда — отдельное рабочее пространство со своими каналами, источниками и участниками.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name" className="mb-2 block">
                Название команды
              </Label>
              <Input
                id="team-name"
                placeholder="Моя новая команда"
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newTeamName.trim() && !isCreatingTeam) {
                    void handleCreateTeam();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTeamDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleCreateTeam()} disabled={!newTeamName.trim() || isCreatingTeam}>
              {isCreatingTeam ? "Создание..." : "Создать команду"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors closeButton theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}


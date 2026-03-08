import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useState, useEffect } from "react";
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
import { getCurrentUser, getUserTeams, createTeam, logoutUser } from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
import { useTheme } from "../context/ThemeContext";
import * as teamService from "../services/teamService";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const { currentTeamId, setCurrentTeamId, refreshTeams } = useTeam();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [teams, setTeams] = useState(getUserTeams());
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const currentTeam = teamService.getTeamById(currentTeamId);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn || !currentUser) {
      navigate("/login");
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn && currentUser && teams.length === 0 && location.pathname !== "/onboarding") {
      // Only redirect to onboarding if user can create teams
      if (currentUser.canCreateTeam) {
        navigate("/onboarding");
      }
    }
  }, [teams, currentUser, navigate, location.pathname]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleSwitchTeam = (teamId: string) => {
    setCurrentTeamId(teamId);
    navigate("/");
  };

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      const newTeam = createTeam(newTeamName.trim());
      setCurrentTeamId(newTeam.id);
      setTeams(getUserTeams());
      refreshTeams();
      setNewTeamName("");
      setIsCreateTeamDialogOpen(false);
      navigate("/");
    }
  };

  // Check if user can create more teams
  const userOwnedTeams = teamService.getAllTeams().filter(t => t.ownerId === currentUser?.id).length;
  const canCreateMoreTeams = currentUser?.canCreateTeam && userOwnedTeams < (currentUser?.maxTeams || 0);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const teamNavItems = [
    { path: "/", label: "Обзор", icon: LayoutDashboard },
    { path: "/channels", label: "Каналы", icon: Radio },
    { path: "/sources", label: "Источники", icon: Rss },
    { path: "/ads", label: "Кампании", icon: Megaphone },
    { path: "/items", label: "Контент", icon: FileText },
    { path: "/jobs", label: "Задачи", icon: Zap },
    { path: "/llm-traces", label: "LLM Трейсы", icon: BrainCircuit },
    { path: "/members", label: "Участники", icon: Users },
    { path: "/settings", label: "Настройки", icon: Settings },
  ];

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Link to="/" className="font-bold text-xl text-gray-900 dark:text-gray-100">
              AI Poster
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Team Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700">
                  <div className="size-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      {currentTeam?.name[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium leading-none">
                      {currentTeam?.name || "Выберите команду"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 leading-none mt-0.5">команда</span>
                  </div>
                  <ChevronDown className="size-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  Преключить команду
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => handleSwitchTeam(team.id)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="size-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {team.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{team.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {team.channelsCount} кан. · {team.sourcesCount} ист.
                      </div>
                    </div>
                    {currentTeamId === team.id && (
                      <Check className="size-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
                {canCreateMoreTeams && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsCreateTeamDialogOpen(true)}
                      className="text-blue-600 dark:text-blue-400 gap-2"
                    >
                      <Plus className="size-4" />
                      Создать новую команду
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="size-9 p-0"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="size-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                    {currentUser.displayName[0].toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{currentUser.displayName}</span>
                  </div>
                  <ChevronDown className="size-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-semibold">{currentUser.displayName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                      {currentUser.email}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="size-4 mr-2" />
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="size-4 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed top-[65px] left-0 h-[calc(100vh-65px)] w-56 bg-white dark:bg-gray-900 border-r transition-transform z-30 flex flex-col`}
        >
          <nav className="flex-1 p-3 overflow-y-auto">
            {currentTeam && (
              <div>
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
                  {currentTeam.name}
                </div>
                <div className="space-y-0.5">
                  {[
                    { path: "/", label: "Обзор", icon: LayoutDashboard },
                    { path: "/channels", label: "Каналы", icon: Radio },
                    { path: "/sources", label: "Источники", icon: Rss },
                    { path: "/ads", label: "Кампании", icon: Megaphone },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <div
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                            active
                              ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                          }`}
                        >
                          <Icon className="size-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

                <div className="space-y-0.5">
                  {[
                    { path: "/posts", label: "Публикации", icon: Send },
                    { path: "/items", label: "Контент", icon: FileText },
                    { path: "/jobs", label: "Задачи", icon: Zap },
                    { path: "/llm-traces", label: "LLM Трейсы", icon: BrainCircuit },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <div
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                            active
                              ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                          }`}
                        >
                          <Icon className="size-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

                <div className="space-y-0.5">
                  {[
                    { path: "/members", label: "Участники", icon: Users },
                    { path: "/settings", label: "Настройки", icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <div
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                            active
                              ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                          }`}
                        >
                          <Icon className="size-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-5 lg:p-7 lg:ml-56">
          {teams.length === 0 && !currentUser.canCreateTeam ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <div className="mx-auto mb-4 size-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                  <Clock className="size-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Нет доступных команд</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  У вас пока нет команд. Попросите владельца команды прислать вам приглашение
                  или обратитесь к администратору для полуения прав на создание команды.
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="size-4 inline mr-1.5" />
                  Проверьте почту — возможно вам уже отправлено приглашение
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Создать новую команду</DialogTitle>
            <DialogDescription>
              Каждая команда — отдельное рабочее пространство со своими каналами,
              источниками и участниками
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
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTeamName.trim()) {
                    handleCreateTeam();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateTeamDialogOpen(false);
                setNewTeamName("");
              }}
            >
              Отмена
            </Button>
            <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
              Создать команду
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors closeButton theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Brain,
  List,
  LogOut,
  Menu,
  Settings2,
  X,
  ChevronDown,
  Shield,
  UserPlus,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toaster } from "sonner";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { currentAdmin, isAdminLoggedIn, isReady, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAdminLoggedIn || !currentAdmin) {
      navigate("/admin/login");
    }
  }, [currentAdmin, isAdminLoggedIn, isReady, navigate]);

  const navItems = [
    { path: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { path: "/admin/users", label: "Пользователи", icon: Users },
    { path: "/admin/invites", label: "Инвайты", icon: UserPlus },
    { path: "/admin/teams", label: "Все команды", icon: Activity },
    { path: "/admin/scheduler-settings", label: "Scheduler", icon: Settings2 },
    { path: "/admin/admins", label: "Администраторы", icon: Shield },
    { path: "/admin/llm-analytics", label: "LLM аналитика", icon: Brain },
    { path: "/admin/llm-traces", label: "LLM traces", icon: List },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  if (!isReady || !currentAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b border-red-100 bg-white dark:border-red-900 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen((value) => !value)} className="lg:hidden">
              {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Link to="/admin/dashboard" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
              AI Poster
              <Badge variant="destructive" className="text-xs">
                Admin
              </Badge>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="size-9 p-0">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex size-8 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white">
                    {currentAdmin.nickname[0]?.toUpperCase() ?? "A"}
                  </div>
                  <div className="hidden items-start md:flex md:flex-col">
                    <span className="text-sm font-medium">{currentAdmin.nickname}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{currentAdmin.isRoot ? "Root" : "Admin"}</span>
                  </div>
                  <ChevronDown className="size-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-semibold">{currentAdmin.nickname}</div>
                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      {currentAdmin.isRoot ? "Root администратор" : "Администратор"}
                    </div>
                  </div>
                </DropdownMenuLabel>
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
          className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed left-0 top-[57px] z-30 flex h-[calc(100vh-57px)] w-56 flex-col border-r bg-white transition-transform dark:bg-gray-900 lg:sticky lg:translate-x-0`}
        >
          <nav className="flex-1 space-y-6 overflow-y-auto p-3">
            <div>
              <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-red-500">Администрирование</div>
              <div className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);

                  return (
                    <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)}>
                      <div
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          active
                            ? "bg-red-50 font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
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
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 lg:p-7">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen ? <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setIsSidebarOpen(false)} /> : null}

      <Toaster position="top-right" richColors closeButton theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}

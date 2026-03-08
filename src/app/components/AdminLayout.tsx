import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Brain,
  LogOut,
  Menu,
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
import { getCurrentAdmin, logoutAdmin } from "../data/mock-data";
import { useTheme } from "../context/ThemeContext";
import { Toaster } from "sonner";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const currentAdmin = getCurrentAdmin();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (!isLoggedIn || !currentAdmin) {
      navigate("/admin/login");
    }
  }, [navigate, currentAdmin]);

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login");
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { path: "/admin/users", label: "Пользователи", icon: Users },
    { path: "/admin/invites", label: "Инвайты", icon: UserPlus },
    { path: "/admin/teams", label: "Все команды", icon: Activity },
    { path: "/admin/admins", label: "Администраторы", icon: Shield },
    { path: "/admin/llm-analytics", label: "LLM Аналитика", icon: Brain },
  ];

  if (!currentAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-red-100 dark:border-red-900 sticky top-0 z-40">
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
            <Link to="/admin/dashboard" className="font-bold text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2">
              AI Poster
              <Badge variant="destructive" className="text-xs">
                Admin
              </Badge>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="size-9 p-0"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="size-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-medium">
                    {currentAdmin.nickname[0].toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{currentAdmin.nickname}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {currentAdmin.isRoot ? "Root" : "Admin"}
                    </span>
                  </div>
                  <ChevronDown className="size-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-semibold">{currentAdmin.nickname}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                      {currentAdmin.isRoot ? "Root Администратор" : "Администратор"}
                    </div>
                  </div>
                </DropdownMenuLabel>
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
          } lg:translate-x-0 fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-56 bg-white dark:bg-gray-900 border-r transition-transform z-30 flex flex-col`}
        >
          <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
            <div>
              <div className="text-xs font-semibold text-red-400 dark:text-red-500 uppercase tracking-wider px-2 mb-1">
                {"Администрирование"}
              </div>
              <div className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <div
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm ${
                          active
                            ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-medium"
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
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-5 lg:p-7">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Toaster position="top-right" richColors closeButton theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}
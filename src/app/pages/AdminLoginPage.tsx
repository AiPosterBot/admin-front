import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { mockAdmins, setCurrentAdmin } from "../data/mock-data";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const admin = mockAdmins.find(
      a => a.nickname === nickname && a.password === password && a.isActive
    );

    if (!admin) {
      setError("Неверный никнейм или пароль");
      return;
    }

    setCurrentAdmin(admin.id);
    localStorage.setItem("isAdminLoggedIn", "true");
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 size-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="size-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Админ-панель</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">AI Poster — вход для администраторов</p>
            <Badge variant="outline" className="mt-2">
              DEV MODE
            </Badge>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="mb-1 block">Никнейм</Label>
              <Input
                id="nickname"
                placeholder="root"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="mb-1 block">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Войти
            </Button>
          </form>

          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-900 font-medium mb-2">
              Тестовые аккаунты:
            </p>
            <ul className="text-sm text-red-800 space-y-1">
              {mockAdmins.map(a => (
                <li key={a.id}>
                  <strong>{a.nickname}</strong> / {a.password}
                  {a.isRoot && " (Root)"}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
              Вход для пользователей →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
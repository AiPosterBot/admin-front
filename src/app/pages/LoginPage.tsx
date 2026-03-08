import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { mockUsers, setCurrentUser } from "../data/mock-data";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const prefillEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const user = mockUsers.find(
      u => u.email === email && u.password === password && u.isActive
    );

    if (!user) {
      setError("Неверный email или пароль");
      return;
    }

    if (!user.emailVerified) {
      setError("Email не подтверждён. Проверьте почту.");
      return;
    }

    setCurrentUser(user.id);
    localStorage.setItem("isLoggedIn", "true");

    // Redirect back to where the user came from (e.g. invite page)
    if (redirectTo) {
      navigate(redirectTo);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 size-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Sparkles className="size-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">AI Poster</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Войдите в свой аккаунт</p>
            <Badge variant="outline" className="mt-2">
              DEV MODE
            </Badge>
          </div>

          {redirectTo && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                Войдите, чтобы продолжить
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="mb-1 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="mb-1 block">Пароль</Label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800">
                  Забыли пароль?
                </Link>
              </div>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Войти
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
              Тестовые аккаунты:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              {mockUsers.filter(u => u.isActive).map(u => (
                <li key={u.id}>
                  <strong>{u.email}</strong> / {u.password} — {u.displayName}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Link to="/admin/login" className="block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Вход для администраторов →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
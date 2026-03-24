import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { PublicThemeToggle } from "../components/PublicThemeToggle";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser } = useAuth();

  const redirectTo = searchParams.get("redirect");
  const prefillEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await loginUser({ email, password });
      navigate(redirectTo || "/");
    } catch (loginError: any) {
      setError(loginError.message || "Не удалось войти");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <PublicThemeToggle />
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Sparkles className="size-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">AI Poster</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Войдите в свой аккаунт</p>
          </div>

          {redirectTo ? (
            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                Войдите, чтобы продолжить.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert
              variant="destructive"
              className="mb-4 border-red-500/40 bg-red-950/40 text-red-200 dark:border-red-500/40 dark:bg-red-950/40"
            >
              <AlertDescription className="text-red-200 dark:text-red-200">{error}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="mb-1 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="mb-1 block">Пароль</Label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Вход..." : "Войти"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/register" className="block text-sm text-blue-600 hover:text-blue-800">
              Создать аккаунт
            </Link>
            <Link to="/admin/login" className="block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Вход для администраторов
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


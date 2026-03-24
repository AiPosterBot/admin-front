import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { PublicThemeToggle } from "../components/PublicThemeToggle";
import { useAuth } from "../context/AuthContext";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await loginAdmin({ nickname, password });
      navigate("/admin/dashboard");
    } catch (loginError: any) {
      setError(loginError.message || "Не удалось войти");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <PublicThemeToggle />
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <Shield className="size-8 text-red-600" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Админ-панель</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI Poster — вход для администраторов</p>
          </div>

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
              <Label htmlFor="nickname" className="mb-1 block">Никнейм</Label>
              <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} autoFocus />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="mb-1 block">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
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

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Вход для пользователей
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Sparkles, Eye, EyeOff, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  registerUser, setCurrentUser, mockAdminInvites, mockInvitations,
} from "../data/mock-data";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // token can be admin invite token (adm_tok_*) or team invite token (tok_*)
  const rawToken = searchParams.get("token") || "";
  const prefillEmail = searchParams.get("email") || "";

  // Determine which type of invite this is
  const isAdminInvite = rawToken.startsWith("adm_tok_");
  const isTeamInvite = rawToken.startsWith("tok_") && !isAdminInvite;

  // Resolve invite info for display
  const adminInvite = isAdminInvite
    ? mockAdminInvites.find(i => i.inviteToken === rawToken && i.status === "pending")
    : null;
  const teamInvite = isTeamInvite
    ? mockInvitations.find(i => i.inviteToken === rawToken && i.status === "pending")
    : null;

  const [step, setStep] = useState<"form" | "verify">("form");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Введите имя");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    // Move to verification step
    setStep("verify");
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (verifyCode.length < 4) {
      setError("Введите код из письма (минимум 4 символа)");
      return;
    }

    try {
      // Actually create the user
      const result = registerUser(
        email.trim(),
        displayName.trim(),
        password,
        isAdminInvite ? rawToken : undefined,
        isTeamInvite ? rawToken : undefined,
      );

      // Auto-login
      setCurrentUser(result.user.id);
      localStorage.setItem("isLoggedIn", "true");

      // Redirect based on context
      if (result.teamInviteToken) {
        // Came from team invite → go to accept page
        navigate(`/invite/${result.teamInviteToken}`);
      } else if (result.adminInviteAccepted) {
        // Admin invited → user can create team → onboarding
        navigate("/onboarding");
      } else {
        // Generic registration (no invite) → go home
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
    }
  };

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 size-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="size-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Подтвердите email</h1>
              <p className="text-gray-600 text-sm">
                Мы отправили код подтверждения на <strong>{email}</strong>
              </p>
            </div>

            {/* DEV hint */}
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800 text-xs">
                <strong>DEV:</strong> В реальном приложении код придёт на email.
                Для тестирования введите любой 4+ символьный код (напр. <strong>1234</strong>).
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="mb-1 block">Код подтверждения</Label>
                <Input
                  id="code"
                  placeholder="1234"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  autoFocus
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                Подтвердить и завершить регистрацию
              </Button>
            </form>

            <button
              onClick={() => { setStep("form"); setError(""); }}
              className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              ← Назад к форме
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 size-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Sparkles className="size-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Регистрация</h1>
            <p className="text-gray-600 text-sm">
              {adminInvite
                ? "Вы получили приглашение от администратора. Создайте аккаунт."
                : teamInvite
                  ? `Вы приглашены в команду. Создайте аккаунт для ${prefillEmail}.`
                  : "Создайте аккаунт AI Poster"}
            </p>
            <Badge variant="outline" className="mt-2">
              DEV MODE
            </Badge>
          </div>

          {/* Admin invite badge */}
          {adminInvite && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <ShieldCheck className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <div className="font-medium">Инвайт от администратора</div>
                <div className="text-xs text-green-600 mt-0.5">
                  После регистрации вы сможете создать свою команду
                </div>
              </div>
            </div>
          )}

          {/* Team invite badge */}
          {teamInvite && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">
                  Приглашение от {teamInvite.invitedByName}
                </div>
                <div className="text-xs text-blue-600 mt-0.5">
                  Зарегистрируйтесь и примите приглашение в команду
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="mb-1 block">Имя</Label>
              <Input
                id="name"
                placeholder="Ваше имя"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="mb-1 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!prefillEmail}
              />
              {!!prefillEmail && (
                <p className="text-xs text-gray-500">
                  Email привязан к приглашению и не может быть изменён
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="mb-1 block">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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

            <div className="space-y-2">
              <Label htmlFor="confirm" className="mb-1 block">Подтвердите пароль</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Зарегистрироваться
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

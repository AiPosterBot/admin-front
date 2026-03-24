import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { PublicThemeToggle } from "../components/PublicThemeToggle";
import { useAuth } from "../context/AuthContext";

export function ForgotPasswordPage() {
  const { forgotPasswordStart, forgotPasswordVerify, forgotPasswordConfirm } = useAuth();

  const [step, setStep] = useState<"email" | "code" | "newPassword" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  useEffect(() => {
    if (resendCooldownSec <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldownSec((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [resendCooldownSec]);

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await forgotPasswordStart(email);
      setStep("code");
      setResendCooldownSec(30);
    } catch (requestError: any) {
      setError(requestError.message || "Не удалось отправить код");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsResendingCode(true);

    try {
      await forgotPasswordStart(email);
      setResendCooldownSec(30);
    } catch (resendError: any) {
      setError(resendError.message || "Не удалось отправить код повторно");
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await forgotPasswordVerify(email, code);
      setVerificationToken(result.verificationToken);
      setStep("newPassword");
    } catch (verifyError: any) {
      setError(verifyError.message || "Неверный код");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordConfirm(email, verificationToken, newPassword);
      setStep("done");
    } catch (confirmError: any) {
      setError(confirmError.message || "Не удалось сменить пароль");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <CheckCircle className="size-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Пароль изменен</h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Теперь можно войти с новым паролем.</p>
          <Button asChild className="w-full" size="lg">
            <Link to="/login">Войти</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <PublicThemeToggle />
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Mail className="size-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {step === "email" && "Восстановление пароля"}
              {step === "code" && "Введите код"}
              {step === "newPassword" && "Новый пароль"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {step === "email" && "Введите email аккаунта"}
              {step === "code" && `Код отправлен на ${email}`}
              {step === "newPassword" && "Придумайте новый пароль"}
            </p>
          </div>

          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="mb-1 block">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Отправка..." : "Отправить код"}
              </Button>
            </form>
          ) : null}

          {step === "code" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="mb-1 block">Код подтверждения</Label>
                <Input
                  id="code"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoFocus
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                <span>Код не пришел?</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleResendCode()}
                  disabled={isSubmitting || isResendingCode || resendCooldownSec > 0}
                  className="h-auto px-0 text-blue-600 hover:bg-transparent hover:text-blue-700 dark:text-blue-300 dark:hover:bg-transparent dark:hover:text-blue-200"
                >
                  {isResendingCode ? "Отправляем..." : resendCooldownSec > 0 ? `Отправить повторно через ${resendCooldownSec}с` : "Отправить повторно"}
                </Button>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Проверка..." : "Подтвердить"}
              </Button>
            </form>
          ) : null}

          {step === "newPassword" ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="mb-1 block">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoFocus
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
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="mb-1 block">Подтвердите пароль</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : "Установить новый пароль"}
              </Button>
            </form>
          ) : null}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <ArrowLeft className="size-3" />
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


import { useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";

export function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "code" | "newPassword" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStep("code");
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      setError("Введите код из письма");
      return;
    }
    setError("");
    setStep("newPassword");
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    setError("");
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 size-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="size-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Пароль изменён</h1>
            <p className="text-gray-600 text-sm mb-6">
              Теперь вы можете войти с новым паролем.
            </p>
            <Link to="/login">
              <Button className="w-full" size="lg">Войти</Button>
            </Link>
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
              <Mail className="size-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {step === "email" && "Восстановление пароля"}
              {step === "code" && "Введите код"}
              {step === "newPassword" && "Новый пароль"}
            </h1>
            <p className="text-gray-600 text-sm">
              {step === "email" && "Введите email, на который зарегистрирован аккаунт"}
              {step === "code" && `Мы отправили код на ${email}`}
              {step === "newPassword" && "Придумайте новый пароль"}
            </p>
          </div>

          {step === "code" && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800 text-xs">
                <strong>DEV:</strong> Введите любой 4+ символьный код для продолжения.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="mb-1 block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Отправить код
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="mb-1 block">Код подтверждения</Label>
                <Input
                  id="code"
                  placeholder="1234"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Подтвердить
              </Button>
            </form>
          )}

          {step === "newPassword" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="mb-1 block">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Минимум 8 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
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
                <Label htmlFor="confirm-password" className="mb-1 block">Подтвердите пароль</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Установить новый пароль
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
              <ArrowLeft className="size-3" />
              Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

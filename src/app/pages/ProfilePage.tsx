import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { UserAvatar } from "../components/UserAvatar";
import { getCurrentUser } from "../data/mock-data";
import {
  Calendar,
  Lock,
  Save,
  Globe,
  Send,
  ExternalLink,
  CheckCircle,
  Unlink,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const BOT_USERNAME = "ai_poster_bot";
const LINK_START_PARAM = "link_account";

const TIMEZONES = [
  { value: "Pacific/Midway", label: "(GMT-11:00) Мидуэй" },
  { value: "Pacific/Honolulu", label: "(GMT-10:00) Гавайи" },
  { value: "America/Anchorage", label: "(GMT-09:00) Аляска" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Лос-Анджелес" },
  { value: "America/Denver", label: "(GMT-07:00) Денвер" },
  { value: "America/Chicago", label: "(GMT-06:00) Чикаго" },
  { value: "America/New_York", label: "(GMT-05:00) Нью-Йорк" },
  { value: "America/Caracas", label: "(GMT-04:00) Каракас" },
  { value: "America/Sao_Paulo", label: "(GMT-03:00) Сан-Паулу" },
  { value: "Atlantic/South_Georgia", label: "(GMT-02:00) Южная Георгия" },
  { value: "Atlantic/Azores", label: "(GMT-01:00) Азорские острова" },
  { value: "Europe/London", label: "(GMT+00:00) Лондон" },
  { value: "Europe/Berlin", label: "(GMT+01:00) Берлин" },
  { value: "Europe/Kiev", label: "(GMT+02:00) Киев" },
  { value: "Europe/Moscow", label: "(GMT+03:00) Москва" },
  { value: "Europe/Samara", label: "(GMT+04:00) Самара" },
  { value: "Asia/Yekaterinburg", label: "(GMT+05:00) Екатеринбург" },
  { value: "Asia/Almaty", label: "(GMT+06:00) Алматы" },
  { value: "Asia/Krasnoyarsk", label: "(GMT+07:00) Красноярск" },
  { value: "Asia/Irkutsk", label: "(GMT+08:00) Иркутск" },
  { value: "Asia/Yakutsk", label: "(GMT+09:00) Якутск" },
  { value: "Asia/Vladivostok", label: "(GMT+10:00) Владивосток" },
  { value: "Asia/Magadan", label: "(GMT+11:00) Магадан" },
  { value: "Pacific/Auckland", label: "(GMT+12:00) Окленд" },
];

function getDefaultTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.some((t) => t.value === tz)) return tz;
  } catch {}
  return "Europe/Moscow";
}

function getSavedTimezone(): string {
  return localStorage.getItem("user_timezone") || getDefaultTimezone();
}

/** QR code via goqr.me free API */
function qrUrl(data: string, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function ProfilePage() {
  const currentUser = getCurrentUser();
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || ""
  );
  const [timezone, setTimezone] = useState(getSavedTimezone());
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Telegram linking flow
  const [tgLinked, setTgLinked] = useState(!!currentUser?.telegramUsername);
  const [tgDialogOpen, setTgDialogOpen] = useState(false);
  const [tgLinking, setTgLinking] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!currentUser) return null;

  const deepLink = `https://t.me/${BOT_USERNAME}?start=${LINK_START_PARAM}_${currentUser.id}`;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Имя успешно обновлено");
  };

  const handleSaveTimezone = () => {
    localStorage.setItem("user_timezone", timezone);
    toast.success("Часовой пояс сохранён", {
      description: TIMEZONES.find((t) => t.value === timezone)?.label,
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Пароли не совпадают", {
        description: "Новый пароль и подтверждение должны совпадать",
      });
      return;
    }
    toast.success("Пароль успешно изменён");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleStartLinking = () => {
    setTgDialogOpen(true);
    setTgLinking(false);
    setLinkCopied(false);
  };

  const handleCopyLink = () => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = deepLink;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  /** Mock: simulate waiting for bot confirmation */
  const handleCheckLink = () => {
    setTgLinking(true);
    setTimeout(() => {
      setTgLinking(false);
      setTgLinked(true);
      setTgDialogOpen(false);
      toast.success("Telegram привязан!", {
        description: `Аккаунт @${currentUser.telegramUsername || "user_tg"} успешно привязан`,
      });
    }, 2000);
  };

  const handleUnlink = () => {
    setTgLinked(false);
    toast.success("Telegram отвязан", {
      description:
        "Привязка удалена. Для создания рекламных постов нужно привязать аккаунт заново.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>
        <p className="text-gray-600 mt-1">Управление настройками аккаунта</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Информация об аккаунте</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={currentUser.displayName} size="xl" />
            <div>
              <h2 className="text-2xl font-bold">{currentUser.displayName}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-600">Email</Label>
              <div className="mt-1 font-mono text-sm">{currentUser.email}</div>
            </div>
            <div>
              <Label className="text-gray-600">ID пользователя</Label>
              <div className="mt-1 font-mono text-sm">{currentUser.id}</div>
            </div>
            <div>
              <Label className="text-gray-600">Дата создания</Label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="size-4 text-gray-400" />
                {new Date(currentUser.createdAt).toLocaleDateString("ru-RU")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Name */}
      <Card>
        <CardHeader>
          <CardTitle>Отображаемое имя</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <Label htmlFor="display-name" className="mb-2 block">
                Имя
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя"
              />
              <p className="text-xs text-gray-500 mt-1">
                Это имя видят другие участники команды
              </p>
            </div>
            <Button type="submit" disabled={!displayName.trim()}>
              <Save className="size-4 mr-2" />
              Сохранить
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Часовой пояс
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="timezone" className="mb-2 block">
              Временная зона
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Выберите часовой пояс" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Все даты и время в интерфейсе будут отображаться в выбранном
              часовом поясе
            </p>
          </div>
          <Button onClick={handleSaveTimezone}>
            <Save className="size-4 mr-2" />
            Сохранить
          </Button>
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-5" />
            Привязка Telegram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tgLinked ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="size-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-900">
                    Telegram привязан
                  </div>
                  <a
                    href={`https://t.me/${currentUser.telegramUsername || "user_tg"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:text-green-800 inline-flex items-center gap-1"
                  >
                    @{currentUser.telegramUsername || "user_tg"}
                    <ExternalLink className="size-3" />
                  </a>
                  {currentUser.telegramLinkedAt && (
                    <div className="text-xs text-green-600 mt-0.5">
                      Привязан{" "}
                      {new Date(
                        currentUser.telegramLinkedAt
                      ).toLocaleDateString("ru-RU")}
                    </div>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-600"
                      title="Отвязать Telegram"
                    >
                      <Unlink className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Отвязать Telegram?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Привязка аккаунта @{currentUser.telegramUsername || "user_tg"} будет удалена.
                        Вы не сможете создавать рекламные посты через бота, пока не привяжете аккаунт заново.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUnlink}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Отвязать
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <p className="text-xs text-gray-500">
                Привязанный аккаунт используется для создания рекламных постов
                через команду{" "}
                <code className="bg-gray-100 px-1 rounded">/ads</code> в боте.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Привяжите Telegram-аккаунт, чтобы создавать рекламные посты
                через бота. После привязки вы сможете отправлять сообщения боту и
                сохранять их как рекламные посты командой{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">/ads</code>.
              </p>
              <Button onClick={handleStartLinking}>
                <Send className="size-4 mr-2" />
                Привязать Telegram
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Telegram linking dialog */}
      <Dialog open={tgDialogOpen} onOpenChange={setTgDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-blue-600" />
              Привязка Telegram
            </DialogTitle>
            <DialogDescription>
              Отсканируйте QR-код или откройте ссылку, чтобы привязать аккаунт
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pr-1">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white dark:bg-white border-2 border-gray-100 rounded-xl p-3 shadow-sm">
                <img
                  src={qrUrl(deepLink, 200)}
                  alt="QR-код для привязки Telegram"
                  className="size-[200px] rounded"
                />
              </div>
            </div>

            {/* Direct link button */}
            <div className="space-y-2">
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full" variant="default">
                  <ExternalLink className="size-4 mr-2" />
                  Открыть бота в Telegram
                </Button>
              </a>

              {/* Copy link */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-xs font-mono text-gray-500 truncate">
                  {deepLink}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {linkCopied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <ol className="space-y-1.5 text-xs text-blue-800">
                <li className="flex gap-2">
                  <span className="size-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    1
                  </span>
                  Отсканируйте QR-код или нажмите «Открыть бота в Telegram»
                </li>
                <li className="flex gap-2">
                  <span className="size-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    2
                  </span>
                  В Telegram нажмите «Начать» (Start)
                </li>
                <li className="flex gap-2">
                  <span className="size-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    3
                  </span>
                  Вернитесь сюда и нажмите «Я привязал аккаунт»
                </li>
              </ol>
            </div>

            {/* Confirm button */}
            <Button
              className="w-full"
              variant="outline"
              onClick={handleCheckLink}
              disabled={tgLinking}
            >
              {tgLinking ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Поверяем привязку...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Я привязал аккаунт
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5" />
            Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="mb-2 block">
                Текущий пароль
              </Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="new-password" className="mb-2 block">
                Новый пароль
              </Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">Минимум 8 символов</p>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="mb-2 block">
                Подтвердите новый пароль
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Изменить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  CheckCircle,
  AlertCircle,
  Copy,
  Bot,
  Loader2,
  ArrowRight,
  ExternalLink,
  Radio,
} from "lucide-react";
import { Channel } from "../data/mock-data";

const BOT_NAME = "@ai_poster_bot";
const BOT_USERNAME = "ai_poster_bot";

// Нормализация ввода канала
function normalizeChannelInput(input: string): { id: string; display: string } | null {
  const s = input.trim();
  if (!s) return null;

  // Уже с @
  if (s.startsWith("@")) {
    const username = s.slice(1);
    return { id: `@${username}`, display: `@${username}` };
  }

  // https://t.me/channelname или t.me/channelname
  const tmeMatch = s.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)/i);
  if (tmeMatch) {
    return { id: `@${tmeMatch[1]}`, display: `@${tmeMatch[1]}` };
  }

  // Просто username без @
  if (/^[a-zA-Z0-9_]{5,}$/.test(s)) {
    return { id: `@${s}`, display: `@${s}` };
  }

  // Числовой ID канала
  if (/^-?\d+$/.test(s)) {
    return { id: s, display: s };
  }

  return null;
}

type Step = "input" | "verify" | "done";
type VerifyStatus = "idle" | "checking" | "success" | "error";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channel: Omit<Channel, "id" | "createdAt" | "teamId">) => void;
}

export function AddChannelDialog({ open, onOpenChange, onCreated }: AddChannelDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [channelInput, setChannelInput] = useState("");
  const [normalizedChannel, setNormalizedChannel] = useState<{ id: string; display: string } | null>(null);
  const [inputError, setInputError] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleReset = () => {
    setStep("input");
    setChannelInput("");
    setNormalizedChannel(null);
    setInputError("");
    setVerifyStatus("idle");
    setVerifyError("");
    setCopied(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  const handleNext = () => {
    const parsed = normalizeChannelInput(channelInput);
    if (!parsed) {
      setInputError(
        "Неверный формат. Введите @username, t.me/username или числовой ID канала."
      );
      return;
    }
    setInputError("");
    setNormalizedChannel(parsed);
    setStep("verify");
    setVerifyStatus("idle");
  };

  const handleCopyBotName = async () => {
    try {
      await navigator.clipboard.writeText(BOT_NAME);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = BOT_NAME;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    setVerifyStatus("checking");
    setVerifyError("");

    // Симуляция проверки: 1.5 секунды задержки, потом успех
    await new Promise(r => setTimeout(r, 1500));

    // В реальности — API запрос. Для демо: симулируем успех
    const isError = channelInput.includes("bad") || channelInput.includes("fail");
    if (isError) {
      setVerifyStatus("error");
      setVerifyError(
        `Бот ${BOT_NAME} не найден в канале ${normalizedChannel?.display} или не является администратором. Убедитесь, что вы добавили бота в канал и дали ему права на отправку сообщений.`
      );
    } else {
      setVerifyStatus("success");
      setStep("done");
    }
  };

  const handleCreate = () => {
    if (!normalizedChannel) return;
    const channelName = normalizedChannel.display.replace("@", "");
    onCreated({
      name: channelName.charAt(0).toUpperCase() + channelName.slice(1),
      telegramId: normalizedChannel.display,
      isActive: true,
      botCanPost: true,
      publishMode: "instant",
      contentStrategy: "newest",   // ЗАМЕНЯЕТ mainPrompt — дефолтная стратегия
      linkedSourcesCount: 0,
      subscribersCount: 0,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="size-5 text-blue-600" />
            {step === "input" && "Добавить Telegram-канал"}
            {step === "verify" && "Подключение бота"}
            {step === "done" && "Канал подключён!"}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Введите ссылку или username вашего Telegram-канала"}
            {step === "verify" && `Добавьте бота ${BOT_NAME} в канал ${normalizedChannel?.display}`}
            {step === "done" && `Канал ${normalizedChannel?.display} успешно добавлен`}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {["input", "verify", "done"].map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : idx < ["input", "verify", "done"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {idx < ["input", "verify", "done"].indexOf(step) ? (
                  <CheckCircle className="size-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 2 && (
                <div
                  className={`h-0.5 w-8 transition-colors ${
                    idx < ["input", "verify", "done"].indexOf(step)
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {step === "input" ? "Ввод канала" : step === "verify" ? "Проверка бота" : "Готово"}
          </span>
        </div>

        {/* Step 1: Input */}
        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-url" className="mb-2 block">
                Канал (ссылка или username)
              </Label>
              <Input
                id="channel-url"
                placeholder="@mychannel или https://t.me/mychannel"
                value={channelInput}
                onChange={e => {
                  setChannelInput(e.target.value);
                  setInputError("");
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && channelInput.trim()) handleNext();
                }}
                autoFocus
                className={inputError ? "border-red-400" : ""}
              />
              {inputError ? (
                <p className="text-xs text-red-500">{inputError}</p>
              ) : (
                <p className="text-xs text-gray-400">
                  Принимается: @channel, t.me/channel, https://t.me/channel или числовой ID
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={handleNext} disabled={!channelInput.trim()}>
                Далее <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verify bot */}
        {step === "verify" && (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="font-medium text-blue-900 text-sm">
                Подключите бота к каналу — 4 простых шага:
              </div>
              <ol className="space-y-3 text-sm text-blue-800">
                <li className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</span>
                  <span>
                    Перейдите в ваш канал{" "}
                    <a
                      href={`https://t.me/${normalizedChannel?.display.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-2 hover:text-blue-600 transition-colors"
                    >
                      {normalizedChannel?.display}
                    </a>{" "}
                    и откройте его настройки
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</span>
                  <span>
                    Добавьте нашего бота{" "}
                    <a
                      href={`https://t.me/${BOT_USERNAME}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-blue-600 transition-colors"
                    >
                      <Bot className="size-3.5" />
                      {BOT_NAME}
                    </a>{" "}
                    в участники канала
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</span>
                  <span>
                    В разделе <strong>Администраторы</strong> назначьте бота администратором канала
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">4</span>
                  <div>
                    Дайте боту все права,{" "}<strong>кроме</strong>{" "}
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 rounded px-1.5 py-0.5 text-xs font-medium">
                      «Добавление новых администраторов»
                    </span>
                  </div>
                </li>
              </ol>
            </div>

            {/* Error state */}
            {verifyStatus === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-sm">{verifyError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("input");
                  setVerifyStatus("idle");
                  setVerifyError("");
                }}
              >
                ← Назад
              </Button>
              <div className="flex gap-2">
                <a
                  href={`https://t.me/${BOT_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <ExternalLink className="size-3.5 mr-1.5" />
                    Открыть бота
                  </Button>
                </a>
                <Button
                  onClick={handleVerify}
                  disabled={verifyStatus === "checking"}
                >
                  {verifyStatus === "checking" ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Проверяем...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-2" />
                      Проверить доступ
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="size-10 text-green-500 mx-auto mb-2" />
              <div className="font-medium text-green-900">Бот успешно подключён!</div>
              <div className="text-sm text-green-700 mt-1">
                Канал <strong>{normalizedChannel?.display}</strong> готов к публикации
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-1">Следующие шаги:</p>
              <ul className="space-y-1 text-gray-500 text-xs">
                <li>• Настройте промпт для канала</li>
                <li>• Привяжите источники контента</li>
                <li>• Выберите режим публикации (instant или schedule)</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Добавить ещё</Button>
              <Button onClick={handleCreate}>
                Открыть канал →
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
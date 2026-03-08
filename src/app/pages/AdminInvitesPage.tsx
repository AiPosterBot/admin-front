import { useState } from "react";
import { Plus, Mail, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "../components/ui/dialog";
import { Alert, AlertDescription } from "../components/ui/alert";
import { mockAdminInvites, sendAdminInvite } from "../data/mock-data";

export function AdminInvitesPage() {
  const [invites, setInvites] = useState(mockAdminInvites);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = () => {
    if (!email.trim()) return;
    const inv = sendAdminInvite(email.trim());
    setInvites([...mockAdminInvites]);
    const link = `${window.location.origin}/register?token=${inv.inviteToken}&email=${encodeURIComponent(email.trim())}`;
    setCreatedInvite({ email: email.trim(), link });
    setEmail("");
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
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

  const handleClose = () => {
    setIsCreateOpen(false);
    setCreatedInvite(null);
    setCopied(false);
    setEmail("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Инвайты пользователей</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Приглашение новых пользователей на платформу
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Пригласить пользователя
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {createdInvite ? "Приглашение создано!" : "Пригласить пользователя"}
              </DialogTitle>
              <DialogDescription>
                {createdInvite
                  ? "Отправьте ссылку пользователю — он сможет зарегистрироваться и создать команду"
                  : "Введите email нового пользователя. Он получит возможность зарегистрироваться и создать одну команду."}
              </DialogDescription>
            </DialogHeader>

            {!createdInvite ? (
              <>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="mb-1 block">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && email.trim()) handleSendInvite();
                      }}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>Отмена</Button>
                  <Button onClick={handleSendInvite} disabled={!email.trim()}>
                    <Mail className="size-4 mr-2" />
                    Отправить приглашение
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="space-y-4 py-2">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-800 text-xs">
                    <strong>DEV:</strong> В реальном приложении ссылка придёт на email. Скопируйте ссылку ниже для тестирования.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-500 mb-1 block">Ссылка для регистрации</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdInvite.link}
                      readOnly
                      className="font-mono text-xs bg-gray-50"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                      variant={copied ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleCopyLink(createdInvite.link)}
                      className="flex-shrink-0"
                    >
                      {copied ? <CheckCircle className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={handleClose} variant="outline" className="w-full">
                  Закрыть
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Invites — Mobile cards */}
      <div className="md:hidden space-y-3">
        {invites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Нет отправленных приглашений</div>
        ) : (
          invites.map((inv) => {
            const link = `${window.location.origin}/register?token=${inv.inviteToken}&email=${encodeURIComponent(inv.email)}`;
            return (
              <div key={inv.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      <Mail className="size-4" />
                    </div>
                    <span className="font-medium text-gray-900 truncate">{inv.email}</span>
                  </div>
                  {inv.status === "pending" && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(link)} title="Копировать ссылку" className="shrink-0">
                      <ExternalLink className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={inv.status === "pending" ? "secondary" : "default"}>
                    {inv.status === "pending" ? "Ожидает" : "Принято"}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invites Table — Desktop */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="w-[80px]">Ссылка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  Нет отправленных приглашений
                </TableCell>
              </TableRow>
            ) : (
              invites.map((inv) => {
                const link = `${window.location.origin}/register?token=${inv.inviteToken}&email=${encodeURIComponent(inv.email)}`;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                          <Mail className="size-4" />
                        </div>
                        <span className="font-medium text-gray-900">{inv.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "pending" ? "secondary" : "default"}>
                        {inv.status === "pending" ? "Ожидает" : "Принято"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(inv.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {inv.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(link)}
                          title="Копировать ссылку"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        <div className="font-medium mb-1">Как это работает</div>
        <ul className="space-y-1 text-blue-700">
          <li>1. Вы отправляете приглашение на email пользователя</li>
          <li>2. Пользователь переходит по ссылке и регистрируется</li>
          <li>3. После регистрации он может создать одну команду со стандартными лимитами</li>
          <li>4. Вы можете изменить лимиты и права в разделе «Пользователи»</li>
        </ul>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Clock, Copy, ExternalLink, Loader2, Mail, Plus, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
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
import { Alert, AlertDescription } from "../components/ui/alert";
import { cancelAdminInvite, createAdminInvite, getAdminInvites, type AdminInviteRecord } from "../services/adminService";

export function AdminInvitesPage() {
  const [invites, setInvites] = useState<AdminInviteRecord[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvites() {
      try {
        const data = await getAdminInvites();
        if (isMounted) {
          setInvites(data);
        }
      } catch {
        if (isMounted) {
          setInvites([]);
        }
      }
    }

    void loadInvites();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSendInvite = async () => {
    if (!email.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await createAdminInvite(email.trim());
      const invite = response.invite;
      setInvites((state) => [invite, ...state.filter((item) => item.id !== invite.id)]);
      setCreatedInvite({
        email: invite.email,
        link: `${window.location.origin}/register?token=${invite.inviteToken}&email=${encodeURIComponent(invite.email)}`,
      });
      setEmail("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить приглашение");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelAdminInvite(inviteId);
      setInvites((state) => state.filter((invite) => invite.id !== inviteId));
      toast.success("Приглашение отменено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отменить приглашение");
    }
  };

  const handleClose = () => {
    setIsCreateOpen(false);
    setCreatedInvite(null);
    setCopied(false);
    setIsSubmitting(false);
    setSubmitError("");
    setEmail("");
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsCreateOpen(true);
      return;
    }

    handleClose();
  };

  const renderInviteStatus = (invite: AdminInviteRecord) =>
    invite.status === "pending" ? (
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700">
        <Clock className="size-3" />
        Ожидает
      </Badge>
    ) : (
      <Badge variant="default">Принято</Badge>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Инвайты пользователей</h1>
          <p className="mt-0.5 text-sm text-gray-500">Приглашение новых пользователей на платформу</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={handleCreateDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Пригласить пользователя
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{createdInvite ? "Приглашение создано" : "Пригласить пользователя"}</DialogTitle>
              <DialogDescription>
                {createdInvite
                  ? "Скопируйте ссылку и отправьте пользователю"
                  : "Пользователь получит право зарегистрироваться и создать команду"}
              </DialogDescription>
            </DialogHeader>

            {!createdInvite ? (
              <>
                <div className="space-y-4 py-4">
                  {submitError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="mb-1 block">
                      Email
                    </Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoFocus
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Отмена
                  </Button>
                  <Button onClick={() => void handleSendInvite()} disabled={!email.trim() || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
                    {isSubmitting ? "Отправка..." : "Отправить приглашение"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="mb-1 block text-xs text-gray-500">Ссылка для регистрации</Label>
                  <div className="flex gap-2">
                    <Input value={createdInvite.link} readOnly className="bg-gray-50 font-mono text-xs" />
                    <Button variant={copied ? "outline" : "default"} size="sm" onClick={() => void handleCopyLink(createdInvite.link)}>
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

      <div className="space-y-3 md:hidden">
        {invites.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Нет отправленных приглашений</div>
        ) : (
          invites.map((invite) => {
            const link = `${window.location.origin}/register?token=${invite.inviteToken}&email=${encodeURIComponent(invite.email)}`;
            return (
              <div key={invite.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                      <Mail className="size-4" />
                    </div>
                    <span className="truncate font-medium text-gray-900">{invite.email}</span>
                  </div>
                  {invite.status === "pending" ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void handleCopyLink(link)} className="shrink-0">
                        <ExternalLink className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="shrink-0 text-red-600 hover:text-red-700">
                            <X className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Отменить приглашение?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Приглашение для {invite.email} будет отменено и исчезнет из списка.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Назад</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleCancelInvite(invite.id)}>
                              Отменить приглашение
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {renderInviteStatus(invite)}
                  <span className="text-xs text-gray-400">{new Date(invite.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden rounded-lg border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="w-[120px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                  Нет отправленных приглашений
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => {
                const link = `${window.location.origin}/register?token=${invite.inviteToken}&email=${encodeURIComponent(invite.email)}`;
                return (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                          <Mail className="size-4" />
                        </div>
                        <span className="font-medium text-gray-900">{invite.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{renderInviteStatus(invite)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{new Date(invite.createdAt).toLocaleDateString("ru-RU")}</span>
                    </TableCell>
                    <TableCell>
                      {invite.status === "pending" ? (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => void handleCopyLink(link)}>
                            <ExternalLink className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <X className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Отменить приглашение?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Приглашение для {invite.email} будет отменено и исчезнет из списка.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Назад</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleCancelInvite(invite.id)}>
                                  Отменить приглашение
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

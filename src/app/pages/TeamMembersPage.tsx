import { useState } from "react";
import { toast } from "sonner";
import { Plus, Mail, Copy, CheckCircle, X, Clock, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Pagination, usePagination } from "../components/Pagination";
import { UserAvatar } from "../components/UserAvatar";
// ── Service layer ────────────────────────────────────────────────────
import { useTeamMembers } from "../hooks/useTeamMembers";
import * as memberService from "../services/memberService";
import { getCurrentUser, getTeamUsage, type Invitation } from "../data/mock-data";
import { useTeam } from "../context/TeamContext";
// ── RBAC ─────────────────────────────────────────────────────────────
import { useTeamPermissions } from "../lib/rbac";
import * as teamService from "../services/teamService";

const PAGE_SIZE = 15;

export function TeamMembersPage() {
  const { currentTeamId } = useTeam();
  const team = teamService.getTeamById(currentTeamId);
  const currentUser = getCurrentUser();

  // ── Реактивный список через сервис ───────────────────────────────
  const { state: membersState, invalidate } = useTeamMembers();

  const [page, setPage] = useState(1);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // ── RBAC ──────────────────────────────────────────────────────────
  const { can, isOwner } = useTeamPermissions();

  if (!team || !currentUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Команда не выбрана</h2>
        <p className="text-gray-600">Выберите команду в верхнем меню</p>
      </div>
    );
  }

  if (membersState.status === "loading" || membersState.status === "idle") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const members = membersState.status === "success" ? membersState.data.members : [];
  const invitations = membersState.status === "success" ? membersState.data.invitations : [];

  const usage = getTeamUsage(team.id);
  const atMemberLimit = usage.membersUsed >= team.limits.maxMembers;

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !currentTeamId) return;
    setInviteError(null);

    const result = await memberService.inviteMember(currentTeamId, inviteEmail.trim());
    if (!result.ok) {
      setInviteError(result.error);
      return;
    }

    // Инвалидируем список — перечитывает и members, и invitations
    invalidate();
    const link = `${window.location.origin}/invite/${result.data.inviteToken}`;
    setCreatedInvite({ email: inviteEmail.trim(), link });
    toast.success(`Приглашение отправлено на ${inviteEmail.trim()}`);
    setInviteEmail("");
  };

  const handleCancelInvite = async (invId: string) => {
    await memberService.cancelInvitation(invId);
    invalidate();
    toast.success("Приглашение отменено");
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
    toast.success("Ссылка скопирована");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseDialog = () => {
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteError(null);
    setCreatedInvite(null);
    setCopied(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    const result = await memberService.removeMember(memberId, currentTeamId!);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // Перечитываем список через сервис
    invalidate();
    toast.success(`Участник "${member?.userName ?? ""}" удалён из команды`);
  };

  const allItems = [
    ...members.map(m => ({ type: 'member' as const, data: m })),
    ...invitations.map(i => ({ type: 'invitation' as const, data: i })),
  ];

  const { totalPages, paginate, totalItems } = usePagination(allItems, PAGE_SIZE);
  const pageItems = paginate(page);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Участники</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {team.name} · {members.length} участников
            {invitations.length > 0 && ` · ${invitations.length} ожидают`}
          </p>
        </div>
        {/* RBAC: кнопка приглашения только для owner (can('member:invite')) */}
        {can("member:invite") && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button disabled={atMemberLimit}>
                <Plus className="size-4 mr-2" />
                Пригласить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {createdInvite ? "Приглашение отправлено!" : "Пригласить участника"}
                </DialogTitle>
                <DialogDescription>
                  {createdInvite
                    ? "Отправьте ссылку приглашённому"
                    : "Введите email пользователя для приглашения в команду"}
                </DialogDescription>
              </DialogHeader>

              {!createdInvite ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email" className="mb-2 block">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && inviteEmail.trim()) handleSendInvite();
                      }}
                      autoFocus
                    />
                    {inviteError && (
                      <p className="text-xs text-red-600 mt-1">{inviteError}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Приглашённый получит те же права, кроме управления участниками
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseDialog}>Отмена</Button>
                    <Button onClick={handleSendInvite} disabled={!inviteEmail.trim()}>
                      <Mail className="size-4 mr-2" />
                      Пригласить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800 text-xs">
                      <strong>DEV:</strong> В реальном приложении ссылка придёт на email. Скопируйте ссылку ниже.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Ссылка-приглашение</Label>
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
                  <Button onClick={handleCloseDialog} variant="outline" className="w-full">
                    Закрыть
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {atMemberLimit && can("member:invite") && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800 text-sm">
            Достигнут лимит участников ({team.limits.maxMembers}). Для увеличения обратитесь к администратору.
          </AlertDescription>
        </Alert>
      )}

      {/* Members — Mobile cards */}
      <div className="md:hidden space-y-3">
        {pageItems.map((item) => {
          if (item.type === 'member') {
            const member = item.data;
            const isMemberOwner = member.role === 'owner';
            return (
              <div key={member.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={member.userName} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{member.userName}</div>
                      <div className="text-xs text-gray-400 truncate">{member.userEmail}</div>
                    </div>
                  </div>
                  {/* RBAC: удаление только для owner */}
                  {can("member:remove") && !isMemberOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 shrink-0">
                          <X className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.userName} будет удалён из команды {team.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {isMemberOwner ? (
                    <Badge variant="default" className="text-xs">Владелец</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Участник</Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                    Активен
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(member.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
            );
          }
          const inv = item.data as Invitation;
          const invLink = `${window.location.origin}/invite/${inv.inviteToken}`;
          return (
            <div key={inv.id} className="bg-amber-50/30 dark:bg-amber-950/30 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-sm flex-shrink-0">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-700 truncate">{inv.email}</div>
                    <div className="text-xs text-gray-400">Приглашён {inv.invitedByName}</div>
                  </div>
                </div>
                {can("member:invite") && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(invLink)} title="Копировать ссылку">
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleCancelInvite(inv.id)} title="Отменить">
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">Участник</Badge>
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50 gap-1">
                  <Clock className="size-3" /> Ожидает
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(inv.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Участник</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Добавлен</TableHead>
              {can("member:remove") && <TableHead className="w-[80px]">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((item) => {
              if (item.type === 'member') {
                const member = item.data;
                const isMemberOwner = member.role === 'owner';
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.userName} />
                        <div>
                          <div className="font-medium text-sm text-gray-900">{member.userName}</div>
                          <div className="text-xs text-gray-400">{member.userEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isMemberOwner ? (
                        <Badge variant="default" className="text-xs">Владелец</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Участник</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                        Активен
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(member.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                    </TableCell>
                    {can("member:remove") && (
                      <TableCell>
                        {!isMemberOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <X className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {member.userName} будет удалён из команды {team.name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              }

              // Pending invitation
              const inv = item.data as Invitation;
              const invLink = `${window.location.origin}/invite/${inv.inviteToken}`;
              return (
                <TableRow key={inv.id} className="bg-amber-50/30 dark:bg-amber-950/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm flex-shrink-0">
                        <Mail className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-700">{inv.email}</div>
                        <div className="text-xs text-gray-400">Приглашён {inv.invitedByName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">Участник</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50 gap-1">
                      <Clock className="size-3" /> Ожидает
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {new Date(inv.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </TableCell>
                  {can("member:remove") && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyLink(invLink)} title="Копировать ссылку">
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCancelInvite(inv.id)}
                          title="Отменить приглашение"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />

      {/* Роли — информация */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
        <div className="font-medium text-blue-900 mb-1">Роли в команде</div>
        <ul className="space-y-1 text-blue-700">
          <li><span className="font-medium">Владелец</span> — создатель команды. Может приглашать и удалять участников.</li>
          <li><span className="font-medium">Участник</span> — приглашённый по email. Те же права, кроме управления людьми.</li>
          <li className="text-blue-600 text-xs mt-2">Ожидающие приглашения занимают слот участника до отмены.</li>
        </ul>
      </div>
    </div>
  );
}
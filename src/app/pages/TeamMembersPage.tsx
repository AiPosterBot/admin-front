import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Clock, Copy, Loader2, Mail, Plus, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
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
} from '../components/ui/alert-dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Pagination, usePagination } from '../components/Pagination'
import { UserAvatar } from '../components/UserAvatar'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useTeam } from '../context/TeamContext'
import { useTeamPermissions } from '../lib/rbac'
import { getLimitAwareErrorMessage } from '../lib/team-limit-messages'
import * as memberService from '../services/memberService'
import { apiGet } from '../lib/api'

const PAGE_SIZE = 15

interface TeamDetailsResponse {
  team: { id: string; name: string; isActive: boolean; createdAt: string; updatedAt: string }
  limits: {
    maxPostsPerDay: number
    maxChannels: number
    maxSources: number
    maxAgentRuns: number
    maxMembers: number
  }
  myRole: 'owner' | 'member'
  stats: {
    channels: number
    sources: number
    items24h: number
    posts24h: number
  }
}

export function TeamMembersPage() {
  const { currentTeamId, currentTeam } = useTeam()
  const { state: membersState, invalidate } = useTeamMembers()
  const { can } = useTeamPermissions()

  const [page, setPage] = useState(1)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<{ email: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadTeam() {
      if (!currentTeamId) {
        return
      }

      try {
        const response = await apiGet<TeamDetailsResponse>(`/api/teams/${currentTeamId}`)
        if (isMounted) {
          setMaxMembers(response.limits.maxMembers)
        }
      } catch {
        if (isMounted) {
          setMaxMembers(null)
        }
      }
    }

    void loadTeam()
    return () => {
      isMounted = false
    }
  }, [currentTeamId])

  if (!currentTeamId || !currentTeam) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Команда не выбрана</h2>
        <p className="text-muted-foreground">Выберите команду в верхнем меню.</p>
      </div>
    )
  }

  if (membersState.status === 'loading' || membersState.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (membersState.status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Не удалось загрузить участников команды.
      </div>
    )
  }

  const members = membersState.data.members
  const invitations = membersState.data.invitations
  const pendingInvitations = invitations.filter((invitation) => invitation.status === 'pending')
  const atMemberLimit = maxMembers !== null && members.length + pendingInvitations.length >= maxMembers

  const allItems = [
    ...members.map((member) => ({ type: 'member' as const, data: member })),
    ...pendingInvitations.map((invitation) => ({ type: 'invitation' as const, data: invitation })),
  ]
  const { totalPages, paginate, totalItems } = usePagination(allItems, PAGE_SIZE)
  const pageItems = paginate(page)

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !currentTeamId) {
      return
    }

    setInviteError(null)
    setIsInviteSubmitting(true)
    try {
      const invitation = await memberService.inviteMember(currentTeamId, inviteEmail.trim())
      invalidate()
      setCreatedInvite({
        email: invitation.email,
        link: `${window.location.origin}/invite/${invitation.inviteToken}`,
      })
      setInviteEmail('')
      toast.success(`Приглашение отправлено на ${invitation.email}`)
    } catch (error: any) {
      setInviteError(getLimitAwareErrorMessage(error, 'Не удалось отправить приглашение'))
    } finally {
      setIsInviteSubmitting(false)
    }
  }

  const handleCancelInvite = async (invitationId: string) => {
    try {
      await memberService.cancelInvitation(currentTeamId, invitationId)
      invalidate()
      toast.success('Приглашение отменено')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось отменить приглашение')
    }
  }

  const handleRemoveMember = async (userId: string, displayName: string) => {
    try {
      await memberService.removeMember(currentTeamId, userId)
      invalidate()
      toast.success(`Участник «${displayName}» удален из команды`)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить участника')
    }
  }

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Ссылка скопирована')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const handleCloseDialog = () => {
    if (isInviteSubmitting) {
      return
    }

    setIsInviteOpen(false)
    setInviteEmail('')
    setInviteError(null)
    setCreatedInvite(null)
    setCopied(false)
  }

  const handleInviteDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsInviteOpen(true)
      return
    }

    handleCloseDialog()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Участники</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {currentTeam.name} · {members.length} участников
            {pendingInvitations.length > 0 ? ` · ${pendingInvitations.length} ожидают` : ''}
          </p>
        </div>

        {can('member:invite') ? (
          <Dialog open={isInviteOpen} onOpenChange={handleInviteDialogOpenChange}>
            <DialogTrigger asChild>
              <Button disabled={atMemberLimit}>
                <Plus className="mr-2 size-4" />
                Пригласить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{createdInvite ? 'Приглашение создано' : 'Пригласить участника'}</DialogTitle>
                <DialogDescription>
                  {createdInvite
                    ? 'Письмо уже отправлено. При необходимости можно скопировать прямую ссылку ниже.'
                    : 'Введите email пользователя для приглашения в команду.'}
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
                      onChange={(event) => {
                        setInviteEmail(event.target.value)
                        setInviteError(null)
                      }}
                      disabled={isInviteSubmitting}
                    />
                    {inviteError ? <p className="mt-1 text-xs text-red-600">{inviteError}</p> : null}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseDialog} disabled={isInviteSubmitting}>Отмена</Button>
                    <Button onClick={() => void handleSendInvite()} disabled={!inviteEmail.trim() || isInviteSubmitting}>
                      {isInviteSubmitting ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 size-4" />
                          Пригласить
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="block text-xs text-muted-foreground">Ссылка-приглашение</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={createdInvite.link} className="bg-muted/50 font-mono text-xs" />
                      <Button variant={copied ? 'outline' : 'default'} size="sm" onClick={() => void handleCopyLink(createdInvite.link)}>
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
        ) : null}
      </div>

      {atMemberLimit && can('member:invite') ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-sm text-amber-800">
            Достигнут лимит участников{maxMembers !== null ? ` (${maxMembers})` : ''}. Ожидающие приглашения тоже учитываются в лимите.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3 md:hidden">
        {pageItems.map((item) => {
          if (item.type === 'member') {
            const member = item.data
            const isOwner = member.role === 'owner'
            return (
              <div key={member.userId} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={member.displayName} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{member.displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                  {can('member:remove') && !isOwner ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="shrink-0 text-red-600 hover:text-red-700">
                          <X className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.displayName} будет удален из команды {currentTeam.name}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleRemoveMember(member.userId, member.displayName)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs">
                    {isOwner ? 'Владелец' : 'Участник'}
                  </Badge>
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700">
                    Активен
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            )
          }

          const invitation = item.data
          const invitationLink = `${window.location.origin}/invite/${invitation.inviteToken}`
          return (
            <div key={invitation.id} className="rounded-lg border bg-amber-50/30 p-4 dark:border-amber-800/30 dark:bg-amber-900/15">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{invitation.email}</div>
                    <div className="text-xs text-muted-foreground">Пригласил {invitation.invitedByName}</div>
                  </div>
                </div>
                {can('member:invite') ? (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void handleCopyLink(invitationLink)}>
                      <Copy className="size-4" />
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
                            Приглашение для {invitation.email} будет отменено и исчезнет из списка ожидающих.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Назад</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleCancelInvite(invitation.id)}>
                            Отменить приглашение
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700">
                  <Clock className="size-3" />
                  Ожидает
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(invitation.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Участник</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Добавлен</TableHead>
              {can('member:remove') ? <TableHead className="w-[100px]">Действия</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((item) => {
              if (item.type === 'member') {
                const member = item.data
                const isOwner = member.role === 'owner'

                return (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.displayName} />
                        <div>
                          <div className="font-medium text-foreground">{member.displayName}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs">
                        {isOwner ? 'Владелец' : 'Участник'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700">
                        Активен
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString('ru-RU')}</span>
                    </TableCell>
                    {can('member:remove') ? (
                      <TableCell>
                        {!isOwner ? (
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
                                  {member.displayName} будет удален из команды {currentTeam.name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleRemoveMember(member.userId, member.displayName)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              }

              const invitation = item.data
              const invitationLink = `${window.location.origin}/invite/${invitation.inviteToken}`
              return (
                <TableRow key={invitation.id} className="bg-amber-50/30 dark:bg-amber-900/10">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Mail className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{invitation.email}</div>
                        <div className="text-xs text-muted-foreground">Пригласил {invitation.invitedByName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">Участник</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700">
                      <Clock className="size-3" />
                      Ожидает
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{new Date(invitation.createdAt).toLocaleDateString('ru-RU')}</span>
                  </TableCell>
                  {can('member:remove') ? (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => void handleCopyLink(invitationLink)}>
                          <Copy className="size-4" />
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
                                Приглашение для {invitation.email} будет отменено и исчезнет из списка ожидающих.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Назад</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleCancelInvite(invitation.id)}>
                                Отменить приглашение
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={PAGE_SIZE} />
    </div>
  )
}


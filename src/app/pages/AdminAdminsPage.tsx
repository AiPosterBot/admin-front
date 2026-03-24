import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Plus, Shield, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { useAdminPermissions } from "../lib/rbac";
import { safeParse, adminSchema } from "../lib/validators";
import { useAuth } from "../context/AuthContext";
import { createAdmin, deleteAdmin, getAdmins, type AdminRecord } from "../services/adminService";

export function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formErrors, setFormErrors] = useState<{ nickname?: string; password?: string }>({});
  const { currentAdmin } = useAuth();
  const { canManageAdmins } = useAdminPermissions();

  useEffect(() => {
    let isMounted = true;

    async function loadAdmins() {
      try {
        const data = await getAdmins();
        if (isMounted) {
          setAdmins(data);
        }
      } catch {
        if (isMounted) {
          setAdmins([]);
        }
      }
    }

    void loadAdmins();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = async () => {
    const result = safeParse(adminSchema, { nickname: newNickname, password: newPassword });
    if (result.ok === false) {
      const nextErrors: { nickname?: string; password?: string } = {};
      const validationErrors = result.errors;
      const issues = validationErrors.issues ?? (validationErrors as any).errors ?? [];
      for (const issue of issues) {
        const field = issue.path[0] as "nickname" | "password";
        nextErrors[field] = issue.message;
      }
      setFormErrors(nextErrors);
      return;
    }

    try {
      const response = await createAdmin(result.data);
      setAdmins((state) => [...state, response.admin]);
      toast.success(`Администратор "${response.admin.nickname}" создан`);
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Не удалось создать администратора");
    }
  };

  const handleDelete = async (adminId: string, nickname: string) => {
    try {
      await deleteAdmin(adminId);
      setAdmins((state) => state.filter((admin) => admin.id !== adminId));
      toast.success(`Администратор "${nickname}" удален`);
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить администратора");
    }
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setNewNickname("");
    setNewPassword("");
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Администраторы</h1>
          <p className="mt-0.5 text-sm text-gray-500">Управление аккаунтами администраторов</p>
        </div>
        {canManageAdmins ? (
          <Dialog open={isCreateOpen} onOpenChange={(open) => open ? setIsCreateOpen(true) : handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Добавить админа
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Новый администратор</DialogTitle>
                <DialogDescription>Создайте аккаунт администратора с никнеймом и паролем</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-nick" className="mb-1 block">Никнейм</Label>
                  <Input
                    id="admin-nick"
                    value={newNickname}
                    onChange={(event) => {
                      setNewNickname(event.target.value);
                      setFormErrors((state) => ({ ...state, nickname: undefined }));
                    }}
                    autoFocus
                    className={formErrors.nickname ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {formErrors.nickname ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="size-3" />
                      {formErrors.nickname}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-pass" className="mb-1 block">Пароль</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setFormErrors((state) => ({ ...state, password: undefined }));
                    }}
                    className={formErrors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {formErrors.password ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="size-3" />
                      {formErrors.password}
                    </p>
                  ) : null}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Отмена</Button>
                <Button onClick={() => void handleCreate()} disabled={!newNickname || !newPassword}>Создать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="space-y-3 md:hidden">
        {admins.map((admin) => (
          <div key={admin.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white">
                  {admin.nickname[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">{admin.nickname}</div>
                  <div className="text-xs text-gray-500">ID: {admin.id}</div>
                </div>
              </div>
              {canManageAdmins && !admin.isRoot && admin.id !== currentAdmin?.id ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0 text-red-600 hover:text-red-700">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить администратора?</AlertDialogTitle>
                      <AlertDialogDescription>Администратор <strong>{admin.nickname}</strong> будет удален.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleDelete(admin.id, admin.nickname)}>
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {admin.isRoot ? (
                <Badge variant="default" className="gap-1"><Shield className="size-3" /> Root</Badge>
              ) : (
                <Badge variant="secondary">Admin</Badge>
              )}
              {admin.id === currentAdmin?.id ? <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700">Вы</Badge> : null}
              <span className="text-xs text-gray-400">{new Date(admin.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Администратор</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Создан</TableHead>
              {canManageAdmins ? <TableHead className="w-[80px]">Действия</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white">
                      {admin.nickname[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        {admin.nickname}
                        {admin.id === currentAdmin?.id ? <Badge variant="outline" className="border-green-200 bg-green-50 text-xs text-green-700">Вы</Badge> : null}
                      </div>
                      <div className="text-xs text-gray-500">ID: {admin.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {admin.isRoot ? (
                    <Badge variant="default" className="gap-1"><Shield className="size-3" /> Root</Badge>
                  ) : (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">{new Date(admin.createdAt).toLocaleDateString("ru-RU")}</span>
                </TableCell>
                {canManageAdmins ? (
                  <TableCell>
                    {!admin.isRoot && admin.id !== currentAdmin?.id ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить администратора?</AlertDialogTitle>
                            <AlertDialogDescription>Администратор <strong>{admin.nickname}</strong> будет удален.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleDelete(admin.id, admin.nickname)}>
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Shield, Trash2, AlertCircle } from "lucide-react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { mockAdmins, getCurrentAdmin } from "../data/mock-data";
// ── RBAC (admin уровень) ─────────────────────────────────────────────
import { useAdminPermissions } from "../lib/rbac";
// ── Zod-валидация ────────────────────────────────────────────────────
import { safeParse, adminSchema } from "../lib/validators";
import { useAuth } from "../context/AuthContext";

export function AdminAdminsPage() {
  const [admins] = useState(mockAdmins);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formErrors, setFormErrors] = useState<{ nickname?: string; password?: string }>({});

  const { currentAdmin } = useAuth();
  // ── Централизованная проверка прав администратора ──
  const { canManageAdmins, isRoot } = useAdminPermissions();

  const handleCreate = () => {
    // Zod-валидация через централизованную схему
    const result = safeParse(adminSchema, { nickname: newNickname, password: newPassword });
    if (!result.ok) {
      const errs: { nickname?: string; password?: string } = {};
      const issues = result.errors.issues ?? (result.errors as any).errors ?? [];
      for (const e of issues) {
        const field = e.path[0] as 'nickname' | 'password';
        errs[field] = e.message;
      }
      setFormErrors(errs);
      return;
    }

    setFormErrors({});
    // В реальном приложении: POST /api/admins
    console.log("Creating admin:", result.data);
    toast.success(`Администратор "${result.data.nickname}" создан`);
    setIsCreateOpen(false);
    setNewNickname("");
    setNewPassword("");
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setNewNickname("");
    setNewPassword("");
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Администраторы</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Управление аккаунтами администраторов
          </p>
        </div>
        {/* RBAC: создание доступно только root */}
        {canManageAdmins && (
          <Dialog open={isCreateOpen} onOpenChange={(o) => o ? setIsCreateOpen(true) : handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Добавить админа
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Новый администратор</DialogTitle>
                <DialogDescription>
                  Создайте аккаунт администратора с никнеймом и паролем
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-nick" className="mb-1 block">Никнейм</Label>
                  <Input
                    id="admin-nick"
                    placeholder="admin_new"
                    value={newNickname}
                    onChange={(e) => {
                      setNewNickname(e.target.value);
                      setFormErrors(p => ({ ...p, nickname: undefined }));
                    }}
                    autoFocus
                    className={formErrors.nickname ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {formErrors.nickname && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3" /> {formErrors.nickname}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Латинские буквы, цифры и _ · 3–30 символов
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-pass" className="mb-1 block">Пароль</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFormErrors(p => ({ ...p, password: undefined }));
                    }}
                    className={formErrors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {formErrors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3" /> {formErrors.password}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Отмена</Button>
                <Button onClick={handleCreate} disabled={!newNickname || !newPassword}>
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Admins — Mobile cards */}
      <div className="md:hidden space-y-3">
        {admins.map((admin) => (
          <div key={admin.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {admin.nickname[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{admin.nickname}</div>
                  <div className="text-xs text-gray-500">ID: {admin.id}</div>
                </div>
              </div>
              {/* RBAC: удаление только root, нельзя удалить самого себя или другого root */}
              {canManageAdmins && !admin.isRoot && admin.id !== currentAdmin?.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 shrink-0">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить администратора?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Администратор <strong>{admin.nickname}</strong> будет удалён. Это действие необратимо.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => toast.success(`Администратор "${admin.nickname}" удалён`)}
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {admin.isRoot ? (
                <Badge variant="default" className="gap-1">
                  <Shield className="size-3" /> Root
                </Badge>
              ) : (
                <Badge variant="secondary">Admin</Badge>
              )}
              {admin.id === currentAdmin?.id && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">Вы</Badge>
              )}
              <span className="text-xs text-gray-400">
                {new Date(admin.createdAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Admins Table — Desktop */}
      <div className="bg-white rounded-lg border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Администратор</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead>Последняя активность</TableHead>
              {canManageAdmins && <TableHead className="w-[80px]">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {admin.nickname[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {admin.nickname}
                        {admin.id === currentAdmin?.id && (
                          <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">Вы</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">ID: {admin.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {admin.isRoot ? (
                    <Badge variant="default" className="gap-1">
                      <Shield className="size-3" />
                      Root
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {new Date(admin.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {new Date(admin.lastActive).toLocaleDateString("ru-RU")}
                  </span>
                </TableCell>
                {canManageAdmins && (
                  <TableCell>
                    {!admin.isRoot && admin.id !== currentAdmin?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить администратора?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Администратор <strong>{admin.nickname}</strong> будет удалён. Это действие необратимо.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => toast.success(`Администратор "${admin.nickname}" удалён`)}
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info block */}
      {!canManageAdmins && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Только Root-администратор может создавать и удалять других администраторов.
        </div>
      )}

      {/* RBAC info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
        <div className="font-medium text-blue-900 mb-1">Роли администраторов</div>
        <ul className="space-y-1 text-blue-700">
          <li><span className="font-medium">Root</span> — создаётся при запуске системы. Может управлять другими администраторами.</li>
          <li><span className="font-medium">Admin</span> — обычный администратор. Управляет командами и пользователями.</li>
        </ul>
      </div>
    </div>
  );
}
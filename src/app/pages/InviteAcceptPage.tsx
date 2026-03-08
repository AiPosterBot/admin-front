import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { UserPlus, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  mockInvitations, mockTeams, mockUsers, mockTeamMembers,
  getCurrentUser, acceptInvitation, logoutUser,
} from "../data/mock-data";

export function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const invitation = mockInvitations.find(i => i.inviteToken === token);
  const currentUser = getCurrentUser();
  const isLoggedIn = !!localStorage.getItem("isLoggedIn") && !!currentUser;

  // ─── Invalid / not found ───
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 size-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="size-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Приглашение не найдено</h1>
            <p className="text-gray-600 text-sm mb-6">
              Ссылка недействительна или приглашение было отменено.
            </p>
            <Link to="/login">
              <Button>Перейти к входу</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Already accepted / cancelled ───
  if (invitation.status !== "pending" && !accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 size-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="size-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {invitation.status === "accepted" ? "Приглашение уже принято" : "Приглашение отменено"}
            </h1>
            <p className="text-gray-600 text-sm mb-6">
              {invitation.status === "accepted"
                ? "Это приглашение уже было принято ранее."
                : "Это приглашение было отменено владельцем команды."}
            </p>
            <Link to={isLoggedIn ? "/" : "/login"}>
              <Button>{isLoggedIn ? "На главную" : "Войти"}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const team = mockTeams.find(t => t.id === invitation.teamId);
  const existingUser = mockUsers.find(u => u.email === invitation.email);

  // Check if logged-in user is already a member of this team
  const alreadyMember = isLoggedIn && currentUser
    ? mockTeamMembers.some(m => m.userId === currentUser.id && m.teamId === invitation.teamId)
    : false;

  // Determine state
  const isLoggedInAsCorrectEmail = isLoggedIn && currentUser?.email === invitation.email;
  const isLoggedInAsWrongEmail = isLoggedIn && currentUser?.email !== invitation.email;

  const handleAccept = () => {
    setError("");
    const success = acceptInvitation(invitation.id);
    if (success) {
      setAccepted(true);
    } else {
      setError("Не удалось принять приглашение. Попробуйте войти под правильным аккаунтом.");
    }
  };

  const handleSwitchAccount = () => {
    logoutUser();
    // Redirect to login with redirect back to this invite page
    navigate(`/login?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`);
  };

  // ─── Success screen ───
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 size-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="size-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Приглашение принято!</h1>
            <p className="text-gray-600 text-sm mb-6">
              Вы присоединились к команде <strong>{team?.name}</strong>.
            </p>
            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              Перейти к команде
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main invite screen ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 size-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="size-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Приглашение в команду</h1>
            <p className="text-gray-600 text-sm">
              <strong>{invitation.invitedByName}</strong> приглашает вас в команду
            </p>
          </div>

          {/* Team info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-blue-700">
                  {team?.name[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">{team?.name}</div>
                <div className="text-xs text-gray-500">
                  {team?.channelsCount} каналов · {team?.sourcesCount} источников · {team?.membersCount} участников
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Приглашён email</span>
              <span className="font-medium">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Роль</span>
              <Badge variant="secondary">Участник</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Пригласил</span>
              <span className="font-medium">{invitation.invitedByName}</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ── Case 1: Logged in as the invited email → can accept directly ── */}
          {isLoggedInAsCorrectEmail && !alreadyMember && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Вы вошли как <strong>{currentUser?.displayName}</strong> ({currentUser?.email})
              </div>
              <Button onClick={handleAccept} className="w-full" size="lg">
                Принять приглашение
              </Button>
            </div>
          )}

          {/* ── Case 1b: Already a member ── */}
          {isLoggedInAsCorrectEmail && alreadyMember && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Вы уже состоите в команде <strong>{team?.name}</strong>.
              </div>
              <Button onClick={() => navigate("/")} className="w-full" size="lg">
                Перейти к команде
              </Button>
            </div>
          )}

          {/* ── Case 2: Logged in as WRONG email ── */}
          {isLoggedInAsWrongEmail && (
            <div className="space-y-3">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800 text-sm">
                  Вы вошли как <strong>{currentUser?.email}</strong>, но приглашение
                  отправлено на <strong>{invitation.email}</strong>.
                  Выйдите и войдите под нужным аккаунтом.
                </AlertDescription>
              </Alert>
              <Button onClick={handleSwitchAccount} variant="outline" className="w-full" size="lg">
                <LogOut className="size-4 mr-2" />
                Сменить аккаунт
              </Button>
            </div>
          )}

          {/* ── Case 3: Not logged in, user exists → go to login ── */}
          {!isLoggedIn && existingUser && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Войдите в аккаунт <strong>{invitation.email}</strong> чтобы принять приглашение
              </p>
              <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invitation.email)}`}>
                <Button className="w-full" size="lg">
                  Войти и принять
                </Button>
              </Link>
            </div>
          )}

          {/* ── Case 4: Not logged in, user doesn't exist → register ── */}
          {!isLoggedIn && !existingUser && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                У вас ещё нет аккаунта. Зарегистрируйтесь чтобы принять приглашение.
              </p>
              <Link to={`/register?email=${encodeURIComponent(invitation.email)}&token=${token}`}>
                <Button className="w-full" size="lg">
                  Зарегистрироваться
                </Button>
              </Link>
              <div className="text-center">
                <Link
                  to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invitation.email)}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Уже есть аккаунт? Войти
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { PublicThemeToggle } from "../components/PublicThemeToggle";
import { useTeam } from "../context/TeamContext";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { createTeam, setCurrentTeamId } = useTeam();
  const [teamName, setTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      return;
    }

    setError("");
    setIsCreating(true);
    try {
      const team = await createTeam(teamName.trim());
      setCurrentTeamId(team.id);
      navigate("/");
    } catch (createError: any) {
      setError(createError.message || "Не удалось создать команду");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <PublicThemeToggle />
      <Card className="w-full max-w-md shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <Sparkles className="size-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">Добро пожаловать в AI Poster</CardTitle>
          <CardDescription className="text-base">
            Создайте первую команду, чтобы начать работу с системой.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName" className="mb-2 block">Название команды</Label>
              <Input
                id="teamName"
                placeholder="Моя первая команда"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && teamName.trim() && !isCreating) {
                    void handleCreateTeam();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Команда — это рабочее пространство для управления каналами, источниками и участниками.
              </p>
            </div>

            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

            <Button onClick={() => void handleCreateTeam()} disabled={!teamName.trim() || isCreating} className="w-full" size="lg">
              {isCreating ? "Создание..." : "Создать команду"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


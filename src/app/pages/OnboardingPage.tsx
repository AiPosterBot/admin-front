import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { createTeam } from "../data/mock-data";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    
    setIsCreating(true);
    
    // Создаем команду
    const newTeam = createTeam(teamName.trim());
    
    // Сохраняем как текущую команду
    localStorage.setItem('currentTeamId', newTeam.id);
    
    // Небольшая задержка для UX
    setTimeout(() => {
      navigate('/');
      window.location.reload(); // Перезагружаем чтобы TeamContext подхватил новую команду
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 size-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Sparkles className="size-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Добро пожаловать в AI Poster!</CardTitle>
          <CardDescription className="text-base">
            Создайте свою первую команду, чтобы начать работу с системой
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName" className="mb-2 block">
                Название команды
              </Label>
              <Input
                id="teamName"
                placeholder="Моя первая команда"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && teamName.trim()) {
                    handleCreateTeam();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Команда - это рабочее пространство для управления каналами и источниками контента
              </p>
            </div>
            
            <Button 
              onClick={handleCreateTeam}
              disabled={!teamName.trim() || isCreating}
              className="w-full"
              size="lg"
            >
              {isCreating ? "Создание..." : "Создать команду"}
            </Button>

            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 text-center">
                После создания команды вы сможете добавлять каналы публикации,<br />
                источники контента и приглашать участников
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
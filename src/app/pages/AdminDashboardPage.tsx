import { Link } from "react-router";
import {
  Users,
  Radio,
  Rss,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  Database,
  Activity,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { mockTeams, mockChannels, mockSources, mockUsers, mockJobs, mockLLMTraces, mockAdmins } from "../data/mock-data";

export function AdminDashboardPage() {
  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter((u) => u.isActive).length;
  const totalAdmins = mockAdmins.length;
  
  const totalTeams = mockTeams.length;
  
  const totalChannels = mockChannels.length;
  const activeChannels = mockChannels.filter((c) => c.isActive).length;
  
  const totalSources = mockSources.length;
  const activeSources = mockSources.filter((s) => s.isActive).length;
  
  const failedJobs = mockJobs.filter((j) => j.status === "failed").length;
  const runningJobs = mockJobs.filter((j) => j.status === "running").length;
  
  const totalLLMCost = mockLLMTraces.reduce((sum, trace) => sum + trace.cost, 0);
  const totalTokens = mockLLMTraces.reduce((sum, trace) => sum + trace.totalTokens, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Администраторский дашборд</h1>
        <p className="text-gray-600">Глобальная статистика и мониторинг системы</p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Статус системы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="size-3 rounded-full bg-green-500" />
              <div>
                <div className="font-medium text-gray-900">Userbot</div>
                <div className="text-sm text-gray-600">Онлайн и активен</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="size-3 rounded-full bg-green-500" />
              <div>
                <div className="font-medium text-gray-900">Планировщик</div>
                <div className="text-sm text-gray-600">{runningJobs} задач</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="size-3 rounded-full bg-blue-500" />
              <div>
                <div className="font-medium text-gray-900">База данных</div>
                <div className="text-sm text-gray-600">Работает</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="size-3 rounded-full bg-purple-500" />
              <div>
                <div className="font-medium text-gray-900">LLM API</div>
                <div className="text-sm text-gray-600">Доступен</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Пользователи
            </CardTitle>
            <Users className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {activeUsers}/{totalUsers}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalAdmins} администраторов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Команды
            </CardTitle>
            <Users className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {totalTeams}
            </div>
            <p className="text-xs text-gray-500 mt-1">Команд в системе</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Каналы
            </CardTitle>
            <Radio className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {activeChannels}/{totalChannels}
            </div>
            <p className="text-xs text-gray-500 mt-1">Активные каналы</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ошибки задач
            </CardTitle>
            <AlertCircle className="size-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{failedJobs}</div>
            <p className="text-xs text-gray-500 mt-1">За последние 24ч</p>
          </CardContent>
        </Card>
      </div>

      {/* LLM Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>LLM Аналитика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <div className="text-sm text-purple-700 mb-1">Всего токенов</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {totalTokens.toLocaleString('ru-RU')}
                  </div>
                </div>
                <Activity className="size-8 text-purple-600" />
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm text-green-700 mb-1">Общая стоимость</div>
                  <div className="text-2xl font-bold text-green-900">
                    ${totalLLMCost.toFixed(2)}
                  </div>
                </div>
                <DollarSign className="size-8 text-green-600" />
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Средняя стоимость запроса</span>
                  <span className="font-medium text-gray-900">
                    ${(totalLLMCost / mockLLMTraces.length).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Всего запросов</span>
                  <span className="font-medium text-gray-900">{mockLLMTraces.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Активность публикаций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-green-900">156</div>
                  <p className="text-sm text-green-700">Успешных постов сегодня</p>
                </div>
                <TrendingUp className="size-8 text-green-600" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Успешность</span>
                  <span className="font-medium text-gray-900">94.2%</span>
                </div>
                <Progress value={94.2} className="h-2" />
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Источники с ошибками</span>
                  <span className="font-medium text-red-600">
                    {mockSources.filter((s) => s.status === "error").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Активные источники</span>
                  <span className="font-medium text-green-600">{activeSources}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="size-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Управление пользователями</div>
                  <div className="text-sm text-gray-600">{totalUsers} пользователей</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/teams">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Users className="size-6 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Все команды</div>
                  <div className="text-sm text-gray-600">{totalTeams} команд</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/llm-analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Activity className="size-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">LLM Аналитика</div>
                  <div className="text-sm text-gray-600">${totalLLMCost.toFixed(2)} использовано</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
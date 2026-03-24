import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold text-gray-200">404</div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
            Страница не найдена
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Страница, которую вы ищете, не существует или была перемещена в другое место.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link to="/">
            <Button>
              <Home className="size-4 mr-2" />
              На главную
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    </div>
  );
}

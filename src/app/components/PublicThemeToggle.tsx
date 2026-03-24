import { Moon, Sun } from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";

export function PublicThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Включить светлую тему" : "Включить темную тему"}
      title={isDark ? "Светлая тема" : "Темная тема"}
      className="fixed right-4 top-4 z-20 border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

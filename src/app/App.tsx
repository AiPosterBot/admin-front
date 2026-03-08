import { RouterProvider } from "react-router";
import { router } from "./routes";
import { TeamProvider } from "./context/TeamContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ArchPanel } from "./components/ArchPanel";

// App root component
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TeamProvider>
          <RouterProvider router={router} />
          {/* Архитектурная панель (dev) — кнопка ⊞ в правом нижнем углу */}
          <ArchPanel />
        </TeamProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
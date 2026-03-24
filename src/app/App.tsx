import { RouterProvider } from "react-router";
import { router } from "./routes";
import { TeamProvider } from "./context/TeamContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ArchPanel } from "./components/ArchPanel";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TeamProvider>
          <RouterProvider router={router} />
          <ArchPanel />
        </TeamProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/ui";
import { AuthProvider } from "./features/auth/AuthContext";
import { TimesProvider } from "./features/prayer-times/TimesContext";
import { LogsProvider } from "./features/tracking/LogsContext";
import { CalendarPage } from "./pages/CalendarPage";
import { ProfilePage } from "./pages/ProfilePage";
import { StatsPage } from "./pages/StatsPage";
import { TodayPage } from "./pages/TodayPage";
import { ThemeProvider } from "./theme/ThemeContext";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TimesProvider>
            <LogsProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<TodayPage />} />
                    <Route path="/takvim" element={<CalendarPage />} />
                    <Route path="/istatistik" element={<StatsPage />} />
                    <Route path="/profil" element={<ProfilePage />} />
                    <Route path="*" element={<TodayPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </LogsProvider>
          </TimesProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

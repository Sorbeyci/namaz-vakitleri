import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/ui";
import { AuthProvider } from "./features/auth/AuthContext";
import { OnboardingProvider } from "./features/onboarding/Onboarding";
import { SettingsProvider } from "./features/settings/SettingsContext";
import { TimesProvider } from "./features/prayer-times/TimesContext";
import { LogsProvider } from "./features/tracking/LogsContext";
import { CalendarPage } from "./pages/CalendarPage";
import { MonthlyTimesPage } from "./pages/MonthlyTimesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { StatsPage } from "./pages/StatsPage";
import { TodayPage } from "./pages/TodayPage";
import { ThemeProvider } from "./theme/ThemeContext";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OnboardingProvider>
        <AuthProvider>
          <SettingsProvider>
            <TimesProvider>
                <LogsProvider>
                <BrowserRouter>
                  <Routes>
                    <Route element={<AppShell />}>
                      <Route path="/" element={<TodayPage />} />
                      <Route path="/vakitler" element={<MonthlyTimesPage />} />
                      <Route path="/takvim" element={<CalendarPage />} />
                      <Route path="/istatistik" element={<StatsPage />} />
                      <Route path="/profil" element={<ProfilePage />} />
                      <Route path="*" element={<TodayPage />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </LogsProvider>
            </TimesProvider>
          </SettingsProvider>
        </AuthProvider>
        </OnboardingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

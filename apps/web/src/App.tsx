import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiClient } from "./lib/apiClient";
import { RoleGuard } from "./components/layout/RoleGuard";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { useAuthStore } from "./stores/useAuthStore";

export function App(): JSX.Element {
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const updateAccessToken = useAuthStore((state) => state.updateAccessToken);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(logout);
    apiClient.setAccessTokenRefreshHandler(updateAccessToken);
  }, [logout, updateAccessToken]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RoleGuard allowed={["admin", "it_operator", "manager"]}>
            <DashboardPage />
          </RoleGuard>
        }
      />
      <Route path="*" element={<Navigate to={role ? "/" : "/login"} replace />} />
    </Routes>
  );
}

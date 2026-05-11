import type { Role } from "@pro-monitor/shared";
import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

interface RoleGuardProps extends PropsWithChildren {
  allowed: Role[];
}

export function RoleGuard({ allowed, children }: RoleGuardProps): JSX.Element {
  const role = useAuthStore((state) => state.role);
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  if (!allowed.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

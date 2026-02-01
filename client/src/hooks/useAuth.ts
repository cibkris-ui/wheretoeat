import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn, apiUrl } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const login = () => {
    window.location.href = apiUrl("/api/login");
  };

  const logout = () => {
    window.location.href = apiUrl("/api/logout");
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

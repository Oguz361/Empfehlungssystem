"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api/auth";
import { isAuthenticated } from "@/lib/api/client";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { teacher, isLoading, setTeacher, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // Check if token exists
      if (!isAuthenticated()) {
        setLoading(false);
        router.push("/login");
        return;
      }

      // If teacher is already in store, we're authenticated
      if (teacher) {
        setLoading(false);
        return;
      }

      // Try to get current user
      try {
        const currentTeacher = await authApi.getCurrentUser();
        setTeacher(currentTeacher);
      } catch (error) {
        // Token is invalid or expired
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [teacher, router, setTeacher, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Lade...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  return <>{children}</>;
}
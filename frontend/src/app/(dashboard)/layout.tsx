"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api/auth";
import { 
  LogOut,
  GraduationCap
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { teacher } = useAuthStore();

  const handleLogout = async () => {
    await authApi.logout();
    router.push("/login");
  };

  return (
    <AuthGuard>
      {/* Hauptcontainer für die Seite */}
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="bg-transparent border-b border-border"> 
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                <GraduationCap className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Knowledge Tracing System</h1>
              </Link>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Angemeldet als <strong>{teacher?.username}</strong>
                </span>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="p-8"> 
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
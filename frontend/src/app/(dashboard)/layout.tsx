"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
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
      {/* Hauptcontainer für die Seite, stellt sicher, dass der Hintergrund dunkel ist */}
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border"> {/* Farben an Darkmode angepasst */}
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-primary mr-3" />
                <h1 className="text-xl font-semibold text-foreground">Knowledge Tracing System</h1> {/* Textfarbe angepasst */}
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground"> {/* Farbe an Darkmode angepasst */}
                  Angemeldet als <strong>{teacher?.username}</strong>
                </span>
                <Button
                  variant="outline" // Behält Outline-Stil, der im Darkmode gut aussieht
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Container für den Hauptinhalt, füllt den verfügbaren Platz */}
        {/* Das 'flex' und 'h-[calc(100vh-4rem)]' sind nicht mehr nötig, da es keine Sidebar gibt */}
        {/* Die innere Scrollbar wird entfernt, indem overflow-y-auto entfernt wird. */}
        {/* Der Page-Content selbst (children) wird nun die Höhe bestimmen und die äußere Scrollbar nutzen. */}
        <main className="p-8"> {/* Kein flex-1 oder overflow-y-auto mehr */}
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
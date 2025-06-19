"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Users, BookOpen, BarChart3, PlusCircle, ArrowRight, Activity, GraduationCapIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Typ für die Lehrer-Statistiken (bleibt gleich)
interface TeacherStats {
  total_classes: number;
  total_students: number;
  total_interactions: number;
  last_activity: string | null;
  member_since: string;
}

// Typ für eine einzelne Klasse für das Dashboard (sollte mit ClassDashboardRead übereinstimmen)
interface DashboardClass {
  id: number;
  name: string;
  student_count: number;
}

export default function DashboardPage() {
  const { teacher } = useAuthStore();
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<DashboardClass[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!teacher) return;
      try {
        setLoadingStats(true);
        const response = await apiClient.get<{ statistics: TeacherStats }>(`/teacher/statistics`);
        setTeacherStats(response.data.statistics);
      } catch (error) {
        console.error("Failed to fetch teacher stats:", error);
        // Optional: setTeacherStats auf einen Fehlerzustand oder leere Daten setzen
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchTeacherClasses = async () => {
      if (!teacher) return;
      try {
        setLoadingClasses(true);
        // *** GEÄNDERTER TEIL START ***
        // Rufe den neuen Endpunkt für Dashboard-Klassendaten ab
        const response = await apiClient.get<DashboardClass[]>(`/teacher/dashboard/classes?limit=5`);
        setTeacherClasses(response.data);
        // *** GEÄNDERTER TEIL ENDE ***
      } catch (error) {
        console.error("Failed to fetch teacher dashboard classes:", error);
        // Optional: setTeacherClasses auf einen Fehlerzustand oder leere Daten setzen
      } finally {
        setLoadingClasses(false);
      }
    };
    
    if (teacher) { // Stelle sicher, dass teacher vorhanden ist, bevor Daten geladen werden
        fetchTeacherStats();
        fetchTeacherClasses();
    } else {
        // Wenn Teacher nicht im Store ist, setze Ladezustände zurück,
        // da AuthGuard ggf. noch arbeitet oder zum Login redirectet.
        setLoadingStats(false);
        setLoadingClasses(false);
    }
  }, [teacher]);

  const summaryCards = [
    {
      title: "Meine Klassen",
      value: teacherStats?.total_classes,
      icon: Users,
      description: "Anzahl Ihrer aktiven Klassen",
      color: "text-primary", // Angepasst an themenbasierte Primärfarbe
    },
    {
      title: "Meine Schüler",
      value: teacherStats?.total_students,
      icon: GraduationCapIcon,
      description: "Gesamtzahl Ihrer Schüler",
      color: "text-green-500", // Behalte spezifische Farben für Indikatoren oder wechsle zu Akzentfarben
    },
    {
      title: "Schüler-Interaktionen",
      value: teacherStats?.total_interactions,
      icon: Activity,
      description: "Gesamte Lernaktivitäten",
      color: "text-purple-500",
    },
    {
      title: "Letzte Aktivität",
      value: teacherStats?.last_activity ? new Date(teacherStats.last_activity).toLocaleDateString('de-DE') : "Keine",
      icon: BarChart3, // Oder z.B. ClockIcon wenn verfügbar
      description: "Letzte erfasste Interaktion",
      color: "text-orange-500",
    },
  ];

  // Wenn der Teacher noch nicht geladen ist (z.B. durch AuthGuard), zeige einen Ladezustand für die ganze Seite
  if (!teacher && (loadingStats || loadingClasses)) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Willkommen zurück, {teacher?.username || "Lehrkraft"}!
        </h2>
        <p className="text-muted-foreground">
          Ihr persönlicher Überblick im Knowledge Tracing System.
        </p>
      </div>

      {/* Persönliche Zusammenfassung */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-1/2" />
              ) : (
                <div className="text-2xl font-bold">
                  {(stat.value === undefined || stat.value === null) ? "N/A" : typeof stat.value === 'number' ? stat.value.toLocaleString("de-DE") : stat.value}
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Meine Klassen im Fokus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Meine Klassen</CardTitle>
            <CardDescription>Schnellzugriff auf Ihre wichtigsten Klassen.</CardDescription>
          </div>
          <Link href="/classes" passHref>
            <Button variant="outline" size="sm">
              Alle Klassen <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingClasses ? (
            <>
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </>
          ) : teacherClasses.length > 0 ? (
            teacherClasses.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/60 transition-colors rounded-lg border border-border">
                <div>
                  <h3 className="font-semibold text-md text-foreground">{cls.name}</h3>
                  <p className="text-sm text-muted-foreground">{cls.student_count} Schüler</p>
                </div>
                <div className="space-x-2">
                  <Link href={`/classes/${cls.id}/students`} passHref>
                    <Button variant="ghost" size="sm">Schüler</Button>
                  </Link>
                  <Link href={`/classes/${cls.id}`} passHref>
                     <Button variant="outline" size="sm">Details</Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Sie haben noch keine Klassen angelegt oder es konnten keine geladen werden.</p>
          )}
          <Button asChild className="mt-4 w-full sm:w-auto">
            {/* TODO: Erstelle eine Route /classes/create im Frontend */}
            <Link href="/classes/create"> 
              <PlusCircle className="mr-2 h-4 w-4" /> Neue Klasse erstellen
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Wichtige Aktionen */}
      <Card>
        <CardHeader>
          <CardTitle>Wichtige Aktionen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button asChild variant="outline" className="h-auto py-4 flex-col items-start hover:border-primary/50 transition-all">
            <Link href="/import" className="flex items-center gap-3 w-full text-left">
              <BookOpen className="h-7 w-7 text-primary mb-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Daten Importieren</span>
                <p className="text-xs text-muted-foreground">Laden Sie neue Schülerinteraktionen hoch.</p>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
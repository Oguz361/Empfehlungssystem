"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Pencil, 
  Users, 
  Calendar,
  BookOpen,
  Activity,
  TrendingUp,
  FileText
} from "lucide-react";
import Link from "next/link";
import { classesApi } from "@/lib/api/classes";
import { apiClient } from "@/lib/api/client";
import { ClassRead, StudentRead } from "@/types/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface ClassStats {
  total_students: number;
  total_interactions: number;
  average_performance: number;
  last_activity: string | null;
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params.id);
  
  const [classData, setClassData] = useState<ClassRead | null>(null);
  const [students, setStudents] = useState<StudentRead[]>([]);
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!classId || isNaN(classId)) {
      toast.error("Ungültige Klassen-ID");
      router.push("/classes");
      return;
    }

    fetchClassData();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      
      // Fetch class details
      const classInfo = await classesApi.getClass(classId);
      setClassData(classInfo);
      
      // Fetch students
      const studentList = await classesApi.getClassStudents(classId);
      setStudents(studentList);
      
      // Calculate basic stats (Platzhalter Infos)
      const mockStats: ClassStats = {
        total_students: studentList.length,
        total_interactions: 0, 
        average_performance: 0, 
        last_activity: null, 
      };
      setStats(mockStats);
      
    } catch (error) {
      console.error("Failed to fetch class data:", error);
      toast.error("Fehler beim Laden der Klassendaten");
      router.push("/classes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  const statsCards = [
    {
      title: "Schüler",
      value: stats?.total_students || 0,
      icon: Users,
      description: "Anzahl der Schüler",
      color: "text-blue-500",
    },
    {
      title: "Interaktionen",
      value: stats?.total_interactions || 0,
      icon: Activity,
      description: "Gesamte Lernaktivitäten",
      color: "text-green-500",
    },
    {
      title: "Durchschnitt",
      value: stats?.average_performance ? `${Math.round(stats.average_performance * 100)}%` : "N/A",
      icon: TrendingUp,
      description: "Durchschnittliche Leistung",
      color: "text-purple-500",
    },
    {
      title: "Letzte Aktivität",
      value: stats?.last_activity ? formatDate(stats.last_activity) : "Keine",
      icon: Calendar,
      description: "Letzte erfasste Interaktion",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href="/classes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
          <p className="text-muted-foreground mt-1">{classData.description}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Erstellt am {formatDate(classData.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/classes/${classId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/classes/${classId}/students`}>
              <Users className="mr-2 h-4 w-4" />
              Schüler verwalten
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground pt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="students">Schüler ({students.length})</TabsTrigger>
          <TabsTrigger value="analysis" disabled>Analysen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Lernfortschritt Übersicht */}
          <Card>
            <CardHeader>
              <CardTitle>Lernfortschritt Übersicht</CardTitle>
              <CardDescription>
                Zusammenfassung der Klassenleistung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Aktive Schüler</p>
                      <p className="text-2xl font-bold">{students.length}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Durchschnittliche Aktivität</p>
                      <p className="text-2xl font-bold text-muted-foreground">Bald verfügbar</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Klassen-Fortschritt</p>
                      <p className="text-2xl font-bold text-muted-foreground">Bald verfügbar</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Fügen Sie Schüler hinzu, um Lernfortschritte zu sehen.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Letzte Aktivitäten */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <CardDescription>
                Neueste Interaktionen in dieser Klasse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Aktivitäten werden angezeigt, sobald Schülerinteraktionen importiert wurden.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schnellaktionen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/import">
                  <FileText className="mr-2 h-4 w-4" />
                  Interaktionen importieren
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <BookOpen className="mr-2 h-4 w-4" />
                Lernmaterialien zuweisen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Schülerliste</CardTitle>
              <CardDescription>
                {students.length} Schüler in dieser Klasse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Keine Schüler</h3>
                  <p className="text-muted-foreground mb-4">
                    Diese Klasse hat noch keine Schüler.
                  </p>
                  <Button asChild>
                    <Link href={`/classes/${classId}/students`}>
                      <Users className="mr-2 h-4 w-4" />
                      Schüler hinzufügen
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.slice(0, 5).map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {student.id}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/students/${student.id}`}>
                          Profil anzeigen
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {students.length > 5 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" asChild>
                        <Link href={`/classes/${classId}/students`}>
                          Alle {students.length} Schüler anzeigen
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-4" />
                <p>Analysen werden in Kürze verfügbar sein.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
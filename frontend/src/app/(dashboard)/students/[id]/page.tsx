"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  User, 
  Activity,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Brain,
  Target
} from "lucide-react";
import Link from "next/link";
import { studentsApi } from "@/lib/api/students";
import { StudentRead } from "@/types/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { StudentRecommendations } from "@/components/recommendations/student-recommendations";

interface StudentStats {
  total_interactions: number;
  correct_interactions: number;
  incorrect_interactions: number;
  accuracy: number;
  skills_practiced: number;
  problems_attempted: number;
  last_activity: string | null;
  activity_status: string;
}

interface StudentInteraction {
  id: number;
  timestamp: string;
  problem: {
    id: number;
    original_id: string;
    description: string;
  };
  skill: {
    id: number;
    name: string;
  };
  is_correct: boolean;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.id);
  
  const [student, setStudent] = useState<StudentRead | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [interactions, setInteractions] = useState<StudentInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!studentId || isNaN(studentId)) {
      toast.error("Ungültige Schüler-ID");
      router.push("/classes");
      return;
    }

    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch student details
      const studentData = await studentsApi.getStudent(studentId);
      setStudent(studentData);
      
      // Fetch statistics
      const statsData = await studentsApi.getStudentStatistics(studentId);
      setStats(statsData.statistics);
      
      // Fetch recent interactions
      const interactionsData = await studentsApi.getStudentInteractions(studentId, 50);
      setInteractions(interactionsData.interactions);
      
    } catch (error) {
      console.error("Failed to fetch student data:", error);
      toast.error("Fehler beim Laden der Schülerdaten");
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

  if (!student || !stats) {
    return null;
  }

  const statsCards = [
    {
      title: "Gesamtaktivität",
      value: stats.total_interactions,
      icon: Activity,
      description: "Bearbeitete Aufgaben",
      color: "text-blue-500",
    },
    {
      title: "Erfolgsrate",
      value: `${stats.accuracy}%`,
      icon: TrendingUp,
      description: `${stats.correct_interactions} von ${stats.total_interactions} richtig`,
      color: stats.accuracy >= 70 ? "text-green-500" : stats.accuracy >= 50 ? "text-yellow-500" : "text-red-500",
    },
    {
      title: "Skills",
      value: stats.skills_practiced,
      icon: Brain,
      description: "Verschiedene Fähigkeiten",
      color: "text-purple-500",
    },
    {
      title: "Letzte Aktivität",
      value: stats.last_activity ? formatDate(stats.last_activity) : "Keine",
      icon: Clock,
      description: stats.activity_status === "active" ? "Aktiv" : "Inaktiv",
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
          className="cursor-pointer"
        >
          <Link href={`/classes/${student.class_id}/students`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Klasse
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {student.first_name} {student.last_name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Schüler-ID: {student.id}</span>
              <span>•</span>
              <span>Hinzugefügt: {formatDate(student.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/import?class_id=${student.class_id}&student_id=${student.id}`)}
            className="cursor-pointer"
          >
            Daten importieren
          </Button>
          <Button 
            size="sm"
            onClick={() => setActiveTab("recommendations")}
            className="cursor-pointer"
          >
            <Target className="mr-2 h-4 w-4" />
            Empfehlungen
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
          <TabsTrigger value="history">Verlauf</TabsTrigger>
          <TabsTrigger value="recommendations">Empfehlungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitätsübersicht</CardTitle>
              <CardDescription>
                Zusammenfassung der Lernaktivitäten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.total_interactions > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Aufgaben bearbeitet</p>
                      <p className="text-2xl font-bold">{stats.problems_attempted}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Skills geübt</p>
                      <p className="text-2xl font-bold">{stats.skills_practiced}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Erfolgsrate</span>
                      <span className="font-medium">{stats.accuracy}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          stats.accuracy >= 70 ? 'bg-green-500' : 
                          stats.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Noch keine Aktivitäten vorhanden.</p>
                  <Button 
                    className="mt-4 cursor-pointer" 
                    size="sm"
                    onClick={() => router.push(`/import?class_id=${student.class_id}&student_id=${student.id}`)}
                  >
                    Erste Interaktionen importieren
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <CardDescription>
                Die neuesten 10 Interaktionen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interactions.length > 0 ? (
                <div className="space-y-2">
                  {interactions.slice(0, 10).map((interaction) => (
                    <div
                      key={interaction.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {interaction.is_correct ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{interaction.skill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Problem: {interaction.problem.original_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(interaction.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Keine Aktivitäten vorhanden
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Interaktionsverlauf</CardTitle>
              <CardDescription>
                Alle {interactions.length} Interaktionen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interactions.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {interaction.is_correct ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{interaction.skill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {interaction.problem.description || `Problem ${interaction.problem.original_id}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={interaction.is_correct ? "default" : "destructive"}>
                          {interaction.is_correct ? "Richtig" : "Falsch"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(interaction.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Noch kein Verlauf vorhanden.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recommendations">
          <StudentRecommendations 
            studentId={studentId}
            studentName={`${student.first_name} ${student.last_name}`}
            totalInteractions={stats.total_interactions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
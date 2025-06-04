"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { Users, BookOpen, Brain, Activity } from "lucide-react";

interface SystemStats {
  skills: number;
  problems: number;
  students: number;
  teachers: number;
  classes: number;
  interactions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get<SystemStats>("/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Klassen",
      value: stats?.classes || 0,
      icon: Users,
      description: "Aktive Klassen",
      color: "text-blue-600",
    },
    {
      title: "Schüler",
      value: stats?.students || 0,
      icon: Users,
      description: "Registrierte Schüler",
      color: "text-green-600",
    },
    {
      title: "Skills",
      value: stats?.skills || 0,
      icon: Brain,
      description: "Verfügbare Skills",
      color: "text-purple-600",
    },
    {
      title: "Interaktionen",
      value: stats?.interactions || 0,
      icon: Activity,
      description: "Aufgezeichnete Lernaktivitäten",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Willkommen im Knowledge Tracing System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : stat.value.toLocaleString("de-DE")}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellzugriff</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <a
            href="/classes"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-primary" />
            <span className="font-medium">Klassen verwalten</span>
          </a>
          <a
            href="/import"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="font-medium">Daten importieren</span>
          </a>
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-gray-50 cursor-not-allowed opacity-50">
            <Brain className="h-8 w-8 text-gray-400" />
            <span className="font-medium text-gray-600">Analysen (bald verfügbar)</span>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">AKT Model:</span>{" "}
              <span className="text-green-600">Geladen ✓</span>
            </p>
            <p>
              <span className="font-medium">Verfügbare Probleme:</span>{" "}
              {stats?.problems.toLocaleString("de-DE") || "..."}
            </p>
            <p>
              <span className="font-medium">API Status:</span>{" "}
              <span className="text-green-600">Online ✓</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
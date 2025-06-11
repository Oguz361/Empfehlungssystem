"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  Target, 
  TrendingUp,
  BarChart3,
  Grid3x3,
  Table as TableIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Activity
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { recommendationsApi, SkillMastery, ProblemRecommendation } from "@/lib/api/recommendations";
import toast from "react-hot-toast";

interface RecommendationConfig {
  timeRange: 'all' | '12weeks';
  visualization: 'radar' | 'bar' | 'table';
  difficulty: 'easy' | 'optimal' | 'challenge';
}

interface StudentRecommendationsProps {
  studentId: number;
  studentName: string;
  totalInteractions: number;
}

const DIFFICULTY_INFO = {
  easy: {
    label: "Übung",
    description: "70-90% Erfolgswahrscheinlichkeit - Festigung des Gelernten",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  optimal: {
    label: "Optimal",
    description: "50-70% Erfolgswahrscheinlichkeit - Zone der nächsten Entwicklung",
    color: "text-blue-600", 
    bgColor: "bg-blue-100",
  },
  challenge: {
    label: "Herausforderung",
    description: "30-50% Erfolgswahrscheinlichkeit - Anspruchsvolle Aufgaben",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  }
};

export function StudentRecommendations({ 
  studentId, 
  studentName,
  totalInteractions 
}: StudentRecommendationsProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [masteryData, setMasteryData] = useState<SkillMastery[] | null>(null);
  const [recommendations, setRecommendations] = useState<ProblemRecommendation[] | null>(null);
  const [overallMastery, setOverallMastery] = useState<number>(0);
  
  const [config, setConfig] = useState<RecommendationConfig>({
    timeRange: 'all',
    visualization: 'radar',
    difficulty: 'optimal'
  });

  // Check if student has enough data
  const hasEnoughData = totalInteractions >= 5;

  const generateRecommendations = async () => {
    setConfigOpen(false);
    setLoading(true);

    try {
      // Fetch mastery profile
      const masteryResponse = await recommendationsApi.getStudentMasteryProfile(studentId);
      setMasteryData(masteryResponse.skill_mastery);
      setOverallMastery(masteryResponse.overall_mastery);

      // Fetch recommendations based on config
      const excludeDays = config.timeRange === '12weeks' ? 84 : undefined;
      const recsResponse = await recommendationsApi.getRecommendedProblems(
        studentId,
        config.difficulty,
        5,
        excludeDays
      );
      setRecommendations(recsResponse.recommendations);

      toast.success("Empfehlungen erfolgreich generiert!");
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      toast.error("Fehler beim Generieren der Empfehlungen");
    } finally {
      setLoading(false);
    }
  };

  // Render mastery visualization based on config
  const renderMasteryVisualization = () => {
    if (!masteryData || masteryData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="mx-auto h-12 w-12 mb-4" />
          <p>Keine Skill-Daten vorhanden</p>
        </div>
      );
    }

    // Prepare data for charts
    const chartData = masteryData.map(skill => ({
      skill: skill.skill_name.length > 20 
        ? skill.skill_name.substring(0, 20) + '...' 
        : skill.skill_name,
      fullName: skill.skill_name,
      mastery: Math.round(skill.mastery * 100),
      attempts: skill.attempt_count
    }));

    // Color based on mastery level
    const getColor = (mastery: number) => {
      if (mastery >= 70) return '#10b981'; // green
      if (mastery >= 40) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    };

    switch (config.visualization) {
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis 
                dataKey="skill" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Mastery"
                dataKey="mastery"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm">Beherrschung: {data.mastery}%</p>
                        <p className="text-sm text-muted-foreground">
                          Versuche: {data.attempts}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData} 
              layout="horizontal"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} />
              <YAxis 
                dataKey="skill" 
                type="category"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm">Beherrschung: {data.mastery}%</p>
                        <p className="text-sm text-muted-foreground">
                          Versuche: {data.attempts}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="mastery">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.mastery)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Skill</th>
                  <th className="text-center p-2">Beherrschung</th>
                  <th className="text-center p-2">Versuche</th>
                  <th className="text-center p-2">Richtig</th>
                </tr>
              </thead>
              <tbody>
                {masteryData.map((skill) => (
                  <tr key={skill.skill_id} className="border-b">
                    <td className="p-2">{skill.skill_name}</td>
                    <td className="p-2 text-center">
                      <Badge 
                        variant="outline"
                        className={`${
                          skill.mastery >= 0.7 ? 'text-green-600 border-green-600' :
                          skill.mastery >= 0.4 ? 'text-yellow-600 border-yellow-600' :
                          'text-red-600 border-red-600'
                        }`}
                      >
                        {Math.round(skill.mastery * 100)}%
                      </Badge>
                    </td>
                    <td className="p-2 text-center">{skill.attempt_count}</td>
                    <td className="p-2 text-center">{skill.correct_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  if (!hasEnoughData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">Mehr Daten benötigt</p>
        <p className="mb-4">
          Mindestens 5 Interaktionen werden für Empfehlungen benötigt.
          <br />
          Aktuell: {totalInteractions} von 5
        </p>
        <Progress value={(totalInteractions / 5) * 100} className="w-48 mx-auto" />
      </div>
    );
  }

  return (
    <>
      {/* Initial state - no recommendations generated yet */}
      {!masteryData && !loading && (
        <div className="text-center py-8">
          <Target className="mx-auto h-12 w-12 text-primary mb-4" />
          <p className="text-lg font-medium mb-4">
            Empfehlungssystem bereit
          </p>
          <p className="text-muted-foreground mb-6">
            Konfigurieren Sie die Empfehlungsparameter für {studentName}
          </p>
          <Button 
            size="lg" 
            onClick={() => setConfigOpen(true)}
            className="cursor-pointer"
          >
            <Brain className="mr-2 h-5 w-5" />
            Empfehlungen konfigurieren
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Generiere Empfehlungen...</p>
            <p className="text-muted-foreground">Dies kann einen Moment dauern</p>
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Results */}
      {masteryData && !loading && (
        <div className="space-y-6">
          {/* Header with regenerate button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Empfehlungen für {studentName}</h3>
              <p className="text-sm text-muted-foreground">
                Basierend auf {config.timeRange === 'all' ? 'allen' : 'den letzten 12 Wochen'} Interaktionen
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="cursor-pointer"
            >
              Neu generieren
            </Button>
          </div>

          {/* Overall Mastery Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gesamtfortschritt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={overallMastery * 100} className="h-3" />
                </div>
                <span className="text-2xl font-bold">
                  {Math.round(overallMastery * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Skills Mastery Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Skill-Beherrschung</CardTitle>
              <CardDescription>
                Übersicht über alle geübten Fähigkeiten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderMasteryVisualization()}
            </CardContent>
          </Card>

          {/* Recommended Problems */}
          {recommendations && recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Empfohlene Aufgaben</CardTitle>
                <CardDescription>
                  Top 5 Aufgaben - Modus: {DIFFICULTY_INFO[config.difficulty].label}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={rec.problem_id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{index + 1}</span>
                          <span className="text-sm font-medium">{rec.skill_name}</span>
                          <Badge variant="outline" className="text-xs">
                            Problem {rec.original_problem_id}
                          </Badge>
                        </div>
                        {rec.description && (
                          <p className="text-sm text-muted-foreground">
                            {rec.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Erfolgswahrscheinlichkeit: {Math.round(rec.predicted_probability * 100)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {rec.recommendation_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Empfehlungen konfigurieren</DialogTitle>
            <DialogDescription>
              Passen Sie die Parameter für die Empfehlungsgenerierung an
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Time Range */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Zeitraum</Label>
              <RadioGroup 
                value={config.timeRange} 
                onValueChange={(value) => setConfig({...config, timeRange: value as 'all' | '12weeks'})}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">
                    Gesamte Historie
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="12weeks" id="12weeks" />
                  <Label htmlFor="12weeks" className="font-normal cursor-pointer">
                    Letzte 12 Wochen
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Visualization */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Visualisierung</Label>
              <RadioGroup 
                value={config.visualization} 
                onValueChange={(value) => setConfig({...config, visualization: value as 'radar' | 'bar' | 'table'})}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="radar" id="radar" />
                  <Label htmlFor="radar" className="font-normal cursor-pointer flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    Radar-Diagramm
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bar" id="bar" />
                  <Label htmlFor="bar" className="font-normal cursor-pointer flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Balkendiagramm
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="table" id="table" />
                  <Label htmlFor="table" className="font-normal cursor-pointer flex items-center gap-2">
                    <TableIcon className="h-4 w-4" />
                    Tabelle
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Empfehlungsfokus</Label>
              <RadioGroup 
                value={config.difficulty} 
                onValueChange={(value) => setConfig({...config, difficulty: value as 'easy' | 'optimal' | 'challenge'})}
              >
                {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                  <div key={key} className="flex items-start space-x-2">
                    <RadioGroupItem value={key} id={key} className="mt-1" />
                    <Label htmlFor={key} className="font-normal cursor-pointer">
                      <div>
                        <span className={`font-medium ${info.color}`}>{info.label}</span>
                        <p className="text-sm text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={generateRecommendations} className="cursor-pointer">
              <Brain className="mr-2 h-4 w-4" />
              Empfehlungen generieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Download,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { classesApi } from "@/lib/api/classes";
import { apiClient } from "@/lib/api/client";
import { ClassRead, StudentRead } from "@/types/api";
import toast from "react-hot-toast";
import { useDropzone } from 'react-dropzone';

interface ImportResult {
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  warnings: string[];
  processing_time_seconds: number;
}

export default function ImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('class_id');

  const [classes, setClasses] = useState<ClassRead[]>([]);
  const [students, setStudents] = useState<StudentRead[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Set preselected class if provided
  useEffect(() => {
    if (preselectedClassId && classes.length > 0) {
      setSelectedClassId(preselectedClassId);
    }
  }, [preselectedClassId, classes]);

  // Fetch students when class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(Number(selectedClassId));
    } else {
      setStudents([]);
      setSelectedStudentId("");
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classesApi.getMyClasses();
      setClasses(data);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error("Fehler beim Laden der Klassen");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId: number) => {
    try {
      const data = await classesApi.getClassStudents(classId);
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Fehler beim Laden der Schüler");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast.error("Bitte nur CSV-Dateien hochladen");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleImport = async () => {
    if (!selectedFile || !selectedClassId || !selectedStudentId) {
      toast.error("Bitte wählen Sie Klasse, Schüler und Datei aus");
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('class_id', selectedClassId);
      formData.append('student_id', selectedStudentId);

      const response = await apiClient.post<ImportResult>(
        '/import/interactions',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setImportResult(response.data);
      
      if (response.data.successful_imports > 0) {
        toast.success(`${response.data.successful_imports} Interaktionen erfolgreich importiert!`);
      }
      
      if (response.data.failed_imports > 0) {
        toast.error(`${response.data.failed_imports} Interaktionen konnten nicht importiert werden`);
      }
      
    } catch (error: any) {
      console.error("Import error:", error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Import der Datei");
      }
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await apiClient.get('/import/template/interactions', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'interaction_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Vorlage heruntergeladen!");
    } catch (error) {
      toast.error("Fehler beim Download der Vorlage");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="cursor-pointer"
      >
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interaktionen importieren</h1>
        <p className="text-muted-foreground mt-1">
          Laden Sie Schülerinteraktionen aus CSV-Dateien hoch
        </p>
      </div>

      {/* Step 1: Select Student */}
      <Card>
        <CardHeader>
          <CardTitle>Schritt 1: Schüler auswählen</CardTitle>
          <CardDescription>
            Wählen Sie den Schüler aus, für den Sie Interaktionen importieren möchten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Klasse</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Klasse auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Schüler</label>
              <Select 
                value={selectedStudentId} 
                onValueChange={setSelectedStudentId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Schüler auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload File */}
      <Card>
        <CardHeader>
          <CardTitle>Schritt 2: CSV-Datei hochladen</CardTitle>
          <CardDescription>
            Die Datei sollte Spalten für problem_id, skill_id, correct und timestamp enthalten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors hover:border-primary/50
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
              ${selectedFile ? 'bg-muted/30' : ''}
            `}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="mx-auto h-12 w-12 text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setImportResult(null);
                  }}
                >
                  Andere Datei wählen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">
                  {isDragActive ? 'Datei hier ablegen' : 'CSV-Datei hier ablegen'}
                </p>
                <p className="text-sm text-muted-foreground">
                  oder klicken zum Auswählen
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV-Vorlage herunterladen
            </Button>

            <Button
              onClick={handleImport}
              disabled={!selectedFile || !selectedStudentId || uploading}
              className="cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importieren
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import-Ergebnis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {importResult.successful_imports}
                </p>
                <p className="text-sm text-muted-foreground">Erfolgreich</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {importResult.failed_imports}
                </p>
                <p className="text-sm text-muted-foreground">Fehlgeschlagen</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {importResult.total_rows}
                </p>
                <p className="text-sm text-muted-foreground">Gesamt</p>
              </div>
            </div>

            {importResult.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warnungen</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {importResult.warnings.slice(0, 5).map((warning, idx) => (
                      <li key={idx} className="text-sm">{warning}</li>
                    ))}
                    {importResult.warnings.length > 5 && (
                      <li className="text-sm">
                        ... und {importResult.warnings.length - 5} weitere Warnungen
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {importResult.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-sm">
                        Zeile {error.row}: {error.error}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-sm">
                        ... und {importResult.errors.length - 5} weitere Fehler
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Verarbeitet in {importResult.processing_time_seconds.toFixed(2)} Sekunden
            </p>
          </CardContent>
        </Card>
      )}

      {/* Format Info */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">CSV-Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">Die CSV-Datei muss folgende Spalten enthalten:</p>
          <div className="bg-background rounded-md p-4 font-mono text-sm">
            problem_id,skill_id,correct,timestamp<br/>
            64525,Circle Graph,1,2023-09-15 10:30:00<br/>
            70363,Area Irregular Figure,0,2023-09-15 10:31:00
          </div>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>problem_id: Original Problem-ID aus dem Datensatz</li>
            <li>skill_id: Original Skill-ID oder Name</li>
            <li>correct: 1 für richtig, 0 für falsch</li>
            <li>timestamp: Datum und Uhrzeit der Interaktion</li>
            <li>Duplikate werden automatisch übersprungen</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
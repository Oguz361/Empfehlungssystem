"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Activity,
  Loader2
} from "lucide-react";
import { classesApi } from "@/lib/api/classes";
import { apiClient } from "@/lib/api/client";
import { ClassRead, StudentRead, StudentCreate } from "@/types/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";

// Form validation schema
const studentSchema = z.object({
  first_name: z.string()
    .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
    .max(50, "Vorname darf maximal 50 Zeichen lang sein"),
  last_name: z.string()
    .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
    .max(50, "Nachname darf maximal 50 Zeichen lang sein"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params.id);
  
  const [classData, setClassData] = useState<ClassRead | null>(null);
  const [students, setStudents] = useState<StudentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const addForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
    },
  });

  const editForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
    },
  });

  useEffect(() => {
    if (!classId || isNaN(classId)) {
      toast.error("Ungültige Klassen-ID");
      router.push("/classes");
      return;
    }

    fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch class details
      const classInfo = await classesApi.getClass(classId);
      setClassData(classInfo);
      
      // Fetch students
      const studentList = await classesApi.getClassStudents(classId);
      setStudents(studentList);
      
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Fehler beim Laden der Daten");
      router.push("/classes");
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Add student
  const handleAddStudent = async (data: StudentFormValues) => {
    try {
      setIsSubmitting(true);
      
      const newStudent: StudentCreate = {
        first_name: data.first_name,
        last_name: data.last_name,
      };
      
      await apiClient.post(`/classes/${classId}/students`, newStudent);
      
      toast.success("Schüler erfolgreich hinzugefügt!");
      setAddDialogOpen(false);
      addForm.reset();
      fetchData(); // Refresh list
    } catch (error: any) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Hinzufügen des Schülers");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit student
  const handleEditStudent = async (data: StudentFormValues) => {
    if (!selectedStudent) return;

    try {
      setIsSubmitting(true);
      
      await apiClient.put(`/students/${selectedStudent.id}`, data);
      
      toast.success("Schüler erfolgreich aktualisiert!");
      setEditDialogOpen(false);
      editForm.reset();
      fetchData(); // Refresh list
    } catch (error: any) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Aktualisieren des Schülers");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      await apiClient.delete(`/students/${selectedStudent.id}`);
      
      toast.success("Schüler erfolgreich gelöscht!");
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      fetchData(); // Refresh list
    } catch (error: any) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Löschen des Schülers");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href={`/classes/${classId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Klasse
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schülerverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            {classData.name} - {filteredStudents.length} Schüler
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Schüler hinzufügen
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Schüler suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schülerliste</CardTitle>
          <CardDescription>
            Alle Schüler in der Klasse {classData.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "Keine Schüler gefunden" : "Noch keine Schüler"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "Keine Schüler entsprechen Ihrer Suche." 
                  : "Fügen Sie den ersten Schüler zu dieser Klasse hinzu."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ersten Schüler hinzufügen
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Letzte Aktivität</TableHead>
                  <TableHead>Hinzugefügt am</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {student.id}
                    </TableCell>
                    <TableCell>
                      {student.last_interaction_update_timestamp ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Activity className="h-4 w-4" />
                          {formatDateTime(student.last_interaction_update_timestamp)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Keine Aktivität</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(student.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Optionen</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/students/${student.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Profil anzeigen
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudent(student);
                              editForm.reset({
                                first_name: student.first_name,
                                last_name: student.last_name,
                              });
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setSelectedStudent(student);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schüler hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Schüler zur Klasse {classData.name} hinzu.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddStudent)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Max"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nachname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mustermann"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Hinzufügen...
                    </>
                  ) : (
                    "Hinzufügen"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schüler bearbeiten</DialogTitle>
            <DialogDescription>
              Ändern Sie die Daten des Schülers.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditStudent)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nachname</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schüler löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie den Schüler "{selectedStudent?.first_name} {selectedStudent?.last_name}" 
              wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStudent}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
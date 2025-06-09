"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { classesApi } from "@/lib/api/classes";
import { ClassRead, ClassCreate } from "@/types/api";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

// Form validation schema
const editClassSchema = z.object({
  name: z.string()
    .min(2, "Name muss mindestens 2 Zeichen lang sein")
    .max(100, "Name darf maximal 100 Zeichen lang sein"),
  description: z.string()
    .min(10, "Beschreibung muss mindestens 10 Zeichen lang sein")
    .max(500, "Beschreibung darf maximal 500 Zeichen lang sein"),
});

type EditClassFormValues = z.infer<typeof editClassSchema>;

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params.id);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassRead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

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
      const data = await classesApi.getClass(classId);
      setClassData(data);
      
      // Set form values
      form.reset({
        name: data.name,
        description: data.description,
      });
    } catch (error) {
      console.error("Failed to fetch class:", error);
      toast.error("Fehler beim Laden der Klasse");
      router.push("/classes");
    } finally {
      setLoading(false);
    }
  };

  async function onSubmit(data: EditClassFormValues) {
    try {
      setIsSubmitting(true);
      
      const updateData: ClassCreate = {
        name: data.name,
        description: data.description,
      };
      
      await classesApi.updateClass(classId, updateData);
      
      toast.success("Klasse erfolgreich aktualisiert!");
      
      // Navigate back to class detail page
      router.push(`/classes/${classId}`);
    } catch (error: any) {
      console.error("Update class error:", error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Aktualisieren der Klasse");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await classesApi.deleteClass(classId);
      toast.success(`Klasse "${classData?.name}" wurde gelöscht`);
      router.push("/classes");
    } catch (error: any) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Löschen der Klasse");
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="cursor-pointer"
      >
        <Link href={`/classes/${classId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Klasse
        </Link>
      </Button>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Klasse bearbeiten</CardTitle>
              <CardDescription>
                Ändern Sie die Details der Klasse "{classData.name}"
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Klassenname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Mathematik 8a"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Ein eindeutiger Name für Ihre Klasse
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="z.B. Mathematik-Grundkurs für die 8. Klasse, Schwerpunkt Algebra und Geometrie"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Eine kurze Beschreibung der Klasse und ihrer Lernziele
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/classes/${classId}`)}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Änderungen speichern"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klasse löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie die Klasse "{classData.name}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
              {" "}
              <span className="font-semibold text-destructive">
                Alle Schüler und deren Daten werden ebenfalls gelöscht!
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Löschen...
                </>
              ) : (
                "Löschen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
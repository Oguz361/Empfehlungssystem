"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { classesApi } from "@/lib/api/classes";
import { ClassRead } from "@/types/api";
import {
  PlusCircle,
  Search,
  Users,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassRead | null>(null);

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

  useEffect(() => {
    fetchClasses();
  }, []);

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!classToDelete) return;

    try {
      await classesApi.deleteClass(classToDelete.id);
      toast.success(`Klasse "${classToDelete.name}" wurde gelöscht`);
      setDeleteDialogOpen(false);
      setClassToDelete(null);
      fetchClasses(); // Refresh list
    } catch (error: any) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Fehler beim Löschen der Klasse");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="cursor-pointer">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Dashboard
        </Link>
      </Button>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meine Klassen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Klassen und Schüler
          </p>
        </div>
        <Button asChild>
          <Link href="/classes/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Neue Klasse
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Klassen durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Klassenübersicht</CardTitle>
          <CardDescription>
            {loading
              ? "Lade..."
              : `${filteredClasses.length} Klasse(n) gefunden`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Keine Klassen gefunden
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Keine Klassen entsprechen Ihrer Suche."
                  : "Erstellen Sie Ihre erste Klasse, um zu beginnen."}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href="/classes/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Erste Klasse erstellen
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/classes/${cls.id}`}
                        className="hover:underline"
                      >
                        {cls.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cls.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(cls.created_at)}
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
                            <Link href={`/classes/${cls.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Details anzeigen
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/classes/${cls.id}/students`}>
                              <Users className="mr-2 h-4 w-4" />
                              Schüler verwalten
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/classes/${cls.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Bearbeiten
                            </Link>
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
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
      >
        <Link href="/classes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Klassen
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schülerprofil</h1>
        <p className="text-muted-foreground mt-1">
          Schüler ID: {studentId}
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">In Entwicklung</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
      >
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daten importieren</h1>
        <p className="text-muted-foreground mt-1">
          Laden Sie Schülerinteraktionen aus CSV-Dateien hoch
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <FileUp className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">In Entwicklung</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
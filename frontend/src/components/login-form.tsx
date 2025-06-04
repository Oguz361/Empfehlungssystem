"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";

// Form validation schema
const loginSchema = z.object({
  username: z.string().min(1, "Benutzername ist erforderlich"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      setIsLoading(true);
      
      await authApi.login(data);
      
      toast.success("Erfolgreich angemeldet!");
      
      // Redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardContent className="pt-6">
        <div className="grid gap-4">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Anmelden</h1>
            <p className="text-muted-foreground">
              Knowledge Tracing System für Lehrkräfte
            </p>
          </div>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Benutzername</Label>
              <Input
                {...form.register("username")}
                id="username"
                type="text"
                placeholder="demo_teacher"
                disabled={isLoading}
                className={cn(
                  form.formState.errors.username && "border-red-500"
                )}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                {...form.register("password")}
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className={cn(
                  form.formState.errors.password && "border-red-500"
                )}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmeldung läuft...
                </>
              ) : (
                "Anmelden"
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Demo-Zugangsdaten:<br />
            Benutzername: <code className="font-mono">demo_teacher</code><br />
            Passwort: <code className="font-mono">demo123</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
"use client";

import { LoginForm } from "@/components/login-form";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api/client";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <GraduationCap className="h-12 w-12 text-blue-400 mb-4" />
          <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-100">
            Knowledge Tracing System
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Intelligente Lernanalyse mit AKT
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

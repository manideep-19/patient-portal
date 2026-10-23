"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePatient } from "@/context/patient-context";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated } = usePatient();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

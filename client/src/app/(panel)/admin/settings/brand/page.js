"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BrandSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/settings");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-slate-400 font-medium">Redirecting to settings...</div>
    </div>
  );
}

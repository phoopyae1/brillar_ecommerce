"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

export function ConditionalHeader() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin") || false;

  // Don't show Header on admin pages since AdminLayout has its own navigation
  if (isAdminPage) {
    return null;
  }

  return <Header />;
}

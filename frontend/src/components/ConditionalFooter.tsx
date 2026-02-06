"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin") || false;

  // Don't show Footer on admin pages since AdminLayout has its own navigation
  if (isAdminPage) {
    return null;
  }

  return <Footer />;
}

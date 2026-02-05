import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeRegistry } from "../components/ThemeRegistry";
import { ConditionalHeader } from "../components/ConditionalHeader";

export const metadata: Metadata = {
  title: "Brillar Ecommerce",
  description: "Premium e-commerce experience"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <ConditionalHeader />
            {children}
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

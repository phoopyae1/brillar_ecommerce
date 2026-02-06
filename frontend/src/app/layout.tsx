import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { Box } from "@mui/material";
import { ThemeRegistry } from "../components/ThemeRegistry";
import { ConditionalHeader } from "../components/ConditionalHeader";
import { ConditionalFooter } from "../components/ConditionalFooter";
import { IntegrationWidget } from "../components/IntegrationWidget";

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
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <ConditionalHeader />
            <Box component="main" sx={{ flex: 1 }}>
              {children}
            </Box>
            <ConditionalFooter />
            <IntegrationWidget />
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

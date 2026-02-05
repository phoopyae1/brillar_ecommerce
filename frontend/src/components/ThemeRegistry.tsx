"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB" }, // Blue
    secondary: { main: "#1E293B" }, // Dark Navy
    warning: { main: "#F59E0B" }, // Amber / Orange (CTA/Accent)
    success: { main: "#16A34A" },
    error: { main: "#DC2626" },
    background: {
      default: "#F8FAFC", // Background
      paper: "#FFFFFF" // Card / Surface
    },
    text: {
      primary: "#0F172A", // Text Primary
      secondary: "#64748B" // Text Muted
    }
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.02em"
    },
    h5: {
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 999
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid #E2E8F0",
          boxShadow: "0px 12px 24px rgba(15, 23, 42, 0.08)"
        }
      }
    }
  }
});

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

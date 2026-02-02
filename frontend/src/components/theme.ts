import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB" },
    secondary: { main: "#0F172A" },
    warning: { main: "#F59E0B" },
    success: { main: "#16A34A" },
    error: { main: "#DC2626" },
    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#111827",
      secondary: "#475569"
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

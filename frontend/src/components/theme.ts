import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1f4d8f" },
    secondary: { main: "#f39c12" }
  },
  typography: {
    fontFamily: "'Inter', sans-serif"
  }
});

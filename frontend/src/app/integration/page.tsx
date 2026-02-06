"use client";

import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Snackbar
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type IntegrationData = {
  contextKey: string;
  iframeOrScript: string;
  role: "user" | "admin";
};

export default function IntegrationPage() {
  const [formData, setFormData] = React.useState<IntegrationData>({
    contextKey: "",
    iframeOrScript: "",
    role: "user"
  });
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contextKey.trim() || !formData.iframeOrScript.trim()) {
      setSnackbar({
        open: true,
        message: "Please fill in all fields",
        severity: "error"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/integration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save integration");
      }

      const message = data.replaced 
        ? `Integration replaced successfully! (Context Key: ${formData.contextKey}, Role: ${formData.role})`
        : `Integration created successfully! (Context Key: ${formData.contextKey}, Role: ${formData.role})`;
      
      setSnackbar({
        open: true,
        message: message,
        severity: "success"
      });

      // Optionally clear form after successful save
      // setFormData({ contextKey: "", iframeOrScript: "", role: "user" });
    } catch (error: any) {
      console.error("Error saving integration:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to save integration. Please try again.",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", py: 8 }}>
      <Container maxWidth="md">
        <Card sx={{ borderRadius: 3, boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)" }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ mb: 4, textAlign: "center" }}>
              <Typography
                variant="h4"
                fontWeight={700}
                gutterBottom
                sx={{
                  background: "linear-gradient(135deg, #2563EB 0%, #1E293B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                Integration Setup
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Configure your integration settings. Adding again will replace existing values.
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {/* Context Key Field */}
                <TextField
                  label="Context Key"
                  placeholder="Enter context key (e.g., my-integration-key)"
                  value={formData.contextKey}
                  onChange={(e) =>
                    setFormData({ ...formData, contextKey: e.target.value })
                  }
                  required
                  fullWidth
                  helperText="Unique identifier for this integration"
                />

                {/* Iframe/Script Field */}
                <TextField
                  label="Iframe or Script Tag"
                  placeholder='<iframe src="..." /> or <script>...</script>'
                  value={formData.iframeOrScript}
                  onChange={(e) =>
                    setFormData({ ...formData, iframeOrScript: e.target.value })
                  }
                  required
                  fullWidth
                  multiline
                  rows={6}
                  helperText="Paste your iframe or script tag code here"
                  sx={{
                    "& .MuiInputBase-input": {
                      fontFamily: "monospace",
                      fontSize: "0.875rem"
                    }
                  }}
                />

                {/* Role Selection */}
                <FormControl component="fieldset" required>
                  <FormLabel component="legend">Role</FormLabel>
                  <RadioGroup
                    row
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "user" | "admin"
                      })
                    }
                  >
                    <FormControlLabel
                      value="user"
                      control={<Radio />}
                      label="User"
                    />
                    <FormControlLabel
                      value="admin"
                      control={<Radio />}
                      label="Admin"
                    />
                  </RadioGroup>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Select whether this integration is for user or admin role. 
                    Saving will replace any existing integration with the same context key.
                  </Typography>
                </FormControl>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  fullWidth
                  sx={{
                    py: 1.5,
                    fontSize: "1rem",
                    fontWeight: 600,
                    textTransform: "none"
                  }}
                >
                  {loading ? "Saving..." : "Save Integration"}
                </Button>
              </Stack>
            </form>


          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          icon={snackbar.severity === "success" ? <CheckCircleIcon /> : undefined}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

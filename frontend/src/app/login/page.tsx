"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link as MuiLink,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import Link from "next/link";
import { LoginSchema } from "@brillar/shared";
import { loginAtenxionUser } from "../../utils/atenxion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function LoginForm({ redirectUrl }: { redirectUrl: string | null }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate input
    try {
      LoginSchema.parse({ email, password });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid input");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setIsLoading(false);
        return;
      }

      // Store tokens and user data
      if (data.accessToken && data.refreshToken && data.user) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Call Atenxion login based on user role
        try {
          const userRole = data.user.role === "ADMIN" ? "admin" : "user";
          console.log("userrole", userRole);
          await loginAtenxionUser(
            {
              userId: data.user.id
            },
            userRole
          );
        } catch (error) {
          // Don't block login if Atenxion fails
          console.error("Atenxion login error (non-blocking):", error);
        }

        // Redirect based on redirect URL, user role, or default
        if (redirectUrl) {
          router.push(redirectUrl);
        } else if (data.user.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/account");
        }
      } else {
        setError("Invalid response from server");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "background.default",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        py: 8
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3, boxShadow: "0px 12px 24px rgba(15, 23, 42, 0.08)" }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Sign In
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Welcome back! Please sign in to your account.
                </Typography>
              </Box>

              {error && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: "error.50",
                    border: "1px solid",
                    borderColor: "error.main"
                  }}
                >
                  <Typography variant="body2" color="error.main">
                    {error}
                  </Typography>
                </Box>
              )}

              <form onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={isLoading}
                    sx={{
                      py: 1.5,
                      fontWeight: 600,
                      borderRadius: 999
                    }}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </Stack>
              </form>

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{" "}
                  <MuiLink
                    component={Link}
                    href="/register"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" }
                    }}
                  >
                    Sign Up
                  </MuiLink>
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null);

  // Get redirect URL from query params
  React.useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, [searchParams]);

  return <LoginForm redirectUrl={redirectUrl} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Box
        sx={{
          backgroundColor: "background.default",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 8
        }}
      >
        <Container maxWidth="sm">
          <Card sx={{ borderRadius: 3, boxShadow: "0px 12px 24px rgba(15, 23, 42, 0.08)" }}>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Typography>Loading...</Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

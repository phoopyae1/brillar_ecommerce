"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Badge,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
  Tooltip
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LoginIcon from "@mui/icons-material/Login";
import { isAdmin, isAuthenticated } from "../utils/auth";

export function Header() {
  const pathname = usePathname();
  const [isAdminUser, setIsAdminUser] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const isAdminPage = pathname?.startsWith("/admin") || false;

  React.useEffect(() => {
    // Check auth status on mount and when storage changes
    const checkAuth = () => {
      setIsLoggedIn(isAuthenticated());
      setIsAdminUser(isAdmin());
    };
    
    checkAuth();
    
    // Listen for storage changes (e.g., when logout clears localStorage)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener("storage", handleStorageChange);
    // Also check periodically in case of same-tab changes
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary"
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", py: 1 }}>
        <Typography
          variant="h5"
          fontWeight={700}
          component={Link}
          href="/"
          sx={{
            textDecoration: "none",
            color: "primary.main",
            background: "linear-gradient(135deg, #2563EB 0%, #1E293B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Brillar Ecommerce
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {!isAdminPage && (
            <Button
              component={Link}
              href="/products"
              sx={{
                color: "text.primary",
                fontWeight: 500,
                "&:hover": { backgroundColor: "action.hover" }
              }}
            >
              Products
            </Button>
          )}
          {isLoggedIn && !isAdminPage && (
            <Tooltip title="Shopping Cart" arrow enterDelay={100} leaveDelay={0}>
              <IconButton
                component={Link}
                href="/cart"
                sx={{
                  color: "text.primary",
                  "&:hover": { backgroundColor: "action.hover" }
                }}
              >
                <Badge badgeContent={2} color="primary">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          {isLoggedIn ? (
            <>
              {!isAdminPage && (
                <Tooltip title="My Account" arrow enterDelay={100} leaveDelay={0}>
                  <IconButton
                    component={Link}
                    href="/account"
                    sx={{
                      color: "text.primary",
                      "&:hover": { backgroundColor: "action.hover" }
                    }}
                  >
                    <PersonIcon />
                  </IconButton>
                </Tooltip>
              )}
              {isAdminUser && !isAdminPage && (
                <Button
                  component={Link}
                  href="/admin"
                  variant="outlined"
                  startIcon={<AdminPanelSettingsIcon />}
                  sx={{
                    borderColor: "divider",
                    color: "text.primary",
                    "&:hover": {
                      borderColor: "primary.main",
                      backgroundColor: "primary.50"
                    }
                  }}
                >
                  Admin
                </Button>
              )}
            </>
          ) : (
            <Button
              component={Link}
              href="/login"
              variant="contained"
              startIcon={<LoginIcon />}
              sx={{
                borderRadius: 999,
                px: 3,
                fontWeight: 600,
                textTransform: "none"
              }}
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

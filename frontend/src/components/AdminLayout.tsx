"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import LogoutIcon from "@mui/icons-material/Logout";
import { logout } from "../utils/auth";

const drawerWidth = 260;

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/admin/products", label: "Products", icon: <InventoryIcon /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingCartIcon /> },
  { href: "/admin/inventory", label: "Inventory", icon: <WarehouseIcon /> }
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect even if there's an error
      window.location.href = "/";
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            display: "flex",
            flexDirection: "column"
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6" fontWeight={700} color="primary.main">
            Admin Panel
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ px: 2, py: 2, flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <ListItemButton
                component={Link}
                href={item.href}
                key={item.href}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "primary.dark"
                    },
                    "& .MuiListItemIcon-root": {
                      color: "white"
                    }
                  },
                  "&:hover": {
                    backgroundColor: "action.hover"
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? "white" : "text.secondary",
                    minWidth: 40
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            disabled={isLoggingOut}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
                backgroundColor: "error.50"
              }
            }}
          >
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </Button>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 4,
          pb: 4,
          pl: 4,
          pr: 6,
          ml: `${drawerWidth}px`,
          maxWidth: `calc(100% - ${drawerWidth}px)`
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

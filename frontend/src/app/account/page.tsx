"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
  Avatar,
  Divider,
  CircularProgress
} from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import Link from "next/link";
import { logout, getUser, isAuthenticated } from "../../utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AccountPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [user, setUser] = React.useState<{ name: string; email: string } | null>(null);
  const [isChecking, setIsChecking] = React.useState(true);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(true);

  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    }
  };

  React.useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push("/login?redirect=/account");
      return;
    }

    // Get user info from localStorage
    const userData = getUser();
    if (userData) {
      setUser({ name: userData.name, email: userData.email });
    }
    setIsChecking(false);

    // Fetch orders
    const fetchOrders = async () => {
      try {
        let accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
          setOrdersLoading(false);
          return;
        }

        let response = await fetch(`${API_URL}/api/orders`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        // If token expired, try to refresh it
        if (response.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetch(`${API_URL}/api/orders`, {
              headers: {
                Authorization: `Bearer ${newToken}`
              }
            });
          } else {
            setOrdersLoading(false);
            return;
          }
        }

        if (response.ok) {
          const data = await response.json();
          const ordersArray = Array.isArray(data) ? data : (data.items || data.orders || []);
          setOrders(ordersArray);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

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

  if (isChecking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", pb: 8 }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
          My Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Manage your account settings and view order history
        </Typography>

        <Grid container spacing={4}>
          {/* Profile Sidebar */}
          <Grid item xs={12} md={3}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Box>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        mb: 2,
                        bgcolor: "grey.200",
                        color: "text.primary",
                        fontSize: 24,
                        fontWeight: 500
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" fontWeight={500}>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {user.email}
                    </Typography>
                  </Box>

                  <Divider />

                  <Stack spacing={0.5}>
                    <Button
                      component={Link}
                      href="/account/orders"
                      startIcon={<ShoppingBagIcon />}
                      fullWidth
                      sx={{ 
                        justifyContent: "flex-start", 
                        textTransform: "none",
                        color: "text.primary",
                        px: 2,
                        py: 1.5
                      }}
                    >
                      My Orders
                    </Button>
                    <Button
                      startIcon={<SettingsIcon />}
                      fullWidth
                      sx={{ 
                        justifyContent: "flex-start", 
                        textTransform: "none",
                        color: "text.primary",
                        px: 2,
                        py: 1.5
                      }}
                    >
                      Settings
                    </Button>
                    <Button
                      startIcon={<LogoutIcon />}
                      fullWidth
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      sx={{ 
                        justifyContent: "flex-start", 
                        textTransform: "none",
                        color: "error.main",
                        px: 2,
                        py: 1.5,
                        mt: 1
                      }}
                    >
                      {isLoggingOut ? "Signing Out..." : "Sign Out"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 4 }}>
                {ordersLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : orders.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <ShoppingBagIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                    <Typography variant="h6" fontWeight={500} gutterBottom>
                      No orders yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
                      You haven't placed any orders yet. Start shopping to see your order history here.
                    </Typography>
                    <Button 
                      variant="contained" 
                      component={Link} 
                      href="/products"
                      sx={{
                        textTransform: "none",
                        fontWeight: 500
                      }}
                    >
                      Start Shopping
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mb: 3 }}>
                      Recent Orders
                    </Typography>
                    <Stack spacing={2}>
                      {orders.slice(0, 3).map((order) => (
                        <Card 
                          key={order.id} 
                          sx={{ 
                            borderRadius: 2, 
                            border: "1px solid", 
                            borderColor: "divider",
                            "&:hover": {
                              borderColor: "primary.main",
                              boxShadow: 1
                            }
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                                  Order #{order.id.slice(0, 8)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                  })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: "right" }}>
                                <Typography variant="h6" fontWeight={600} color="primary.main">
                                  ${Number(order.total).toFixed(2)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {order.status}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                      {orders.length > 3 && (
                        <Box sx={{ textAlign: "center", pt: 2 }}>
                          <Button 
                            variant="outlined" 
                            component={Link} 
                            href="/account/orders"
                            sx={{
                              textTransform: "none",
                              fontWeight: 500
                            }}
                          >
                            View All Orders ({orders.length})
                          </Button>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

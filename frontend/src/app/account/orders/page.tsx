"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  IconButton
} from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import Link from "next/link";
import { isAuthenticated } from "../../../utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  productId?: string;
  product?: {
    id: string;
    name: string;
    images: string[];
    slug: string;
  };
};

type Order = {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
};

const getStatusText = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return "Delivered";
    case "PAID":
      return "Shipped";
    case "PENDING":
      return "Processing";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return "#10b981"; // green
    case "PAID":
      return "#3b82f6"; // blue
    case "PENDING":
      return "#f59e0b"; // amber
    case "CANCELLED":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState(0);
  const [timeFilter, setTimeFilter] = React.useState("1");

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
    if (!isAuthenticated()) {
      router.push("/login?redirect=/account/orders");
      return;
    }

    const fetchOrders = async () => {
      try {
        let accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
          throw new Error("No access token found");
        }

        let response = await fetch(`${API_URL}/api/orders`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (response.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetch(`${API_URL}/api/orders`, {
              headers: {
                Authorization: `Bearer ${newToken}`
              }
            });
          } else {
            router.push("/login?redirect=/account/orders");
            return;
          }
        }

        if (!response.ok) {
          let errorMessage = `Failed to fetch orders (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const ordersArray = Array.isArray(data) ? data : (data.items || data.orders || []);
        setOrders(ordersArray);
      } catch (err: any) {
        console.error("Error fetching orders:", err);
        setError(err.message || "Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const filteredOrders = React.useMemo(() => {
    let filtered = orders;

    // Filter by tab
    if (activeTab === 1) {
      // Not Yet Shipped
      filtered = filtered.filter(o => o.status === "PAID" || o.status === "PENDING");
    } else if (activeTab === 2) {
      // Cancelled Orders
      filtered = filtered.filter(o => o.status === "CANCELLED");
    }

    // Filter by time (simplified - you can implement actual date filtering)
    return filtered;
  }, [orders, activeTab]);

  const getProductImage = (item: OrderItem): string => {
    if (item.product?.images && item.product.images.length > 0) {
      const imageUrl = item.product.images[0];
      return imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`;
    }
    return "/placeholder-product.png";
  };

  const getProductSlug = (item: OrderItem): string => {
    return item.product?.slug || `/products/${item.productId || ""}`;
  };

  if (loading) {
    return (
      <Box sx={{ backgroundColor: "#f9fafb", minHeight: "100vh", pb: 8 }}>
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
            <Typography>Loading orders...</Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "#f9fafb", minHeight: "100vh", pb: 8 }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.75rem", sm: "2rem" } }}>
            Your Orders
        </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              sx={{
                bgcolor: "white",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#d1d5db"
                }
              }}
            >
              <MenuItem value="1">Past 1 Year</MenuItem>
              <MenuItem value="2">Past 2 Years</MenuItem>
              <MenuItem value="3">Past 3 Years</MenuItem>
              <MenuItem value="all">All Orders</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                minHeight: 48,
                "&.Mui-selected": {
                  color: "#2563eb",
                  fontWeight: 600
                }
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 3
              }
            }}
          >
            <Tab label={`Order (${orders.length})`} />
            <Tab label={`Not Yet Shipped (${orders.filter(o => o.status === "PAID" || o.status === "PENDING").length})`} />
            <Tab label={`Cancelled Orders (${orders.filter(o => o.status === "CANCELLED").length})`} />
          </Tabs>
        </Box>

        {error && (
          <Card sx={{ borderRadius: 2, mb: 3, border: "1px solid", borderColor: "error.main", bgcolor: "error.50" }}>
            <CardContent>
              <Typography variant="body1" color="error.main" fontWeight={500}>
                {error}
              </Typography>
            </CardContent>
          </Card>
        )}

        {filteredOrders.length === 0 && !error && !loading ? (
          <Card sx={{ borderRadius: 2, bgcolor: "white" }}>
            <CardContent sx={{ textAlign: "center", py: 8 }}>
              <ShoppingBagIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                No orders yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                You haven't placed any orders yet. Start shopping to see your order history here.
              </Typography>
              <Button variant="contained" component={Link} href="/products" size="large">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={3}>
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                sx={{
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden"
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  {/* Order Header */}
                  <Box
                    sx={{
                      p: 3,
                      borderBottom: "1px solid #e5e7eb",
                      bgcolor: "#f9fafb"
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", gap: 2, mb: 1, flexWrap: "wrap" }}>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                              month: "short",
                            day: "numeric"
                          })}
                        </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Total:</strong> {order.currency} {Number(order.total).toFixed(2)}
                          </Typography>
                    </Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Order ID:</strong> #{order.id.slice(0, 12).toUpperCase()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{
                            textTransform: "none",
                            borderColor: "#d1d5db",
                            color: "#374151",
                            "&:hover": {
                              borderColor: "#9ca3af",
                              bgcolor: "#f9fafb"
                            }
                          }}
                        >
                          View Invoice
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            textTransform: "none",
                            bgcolor: "#2563eb",
                            "&:hover": {
                              bgcolor: "#1d4ed8"
                            }
                          }}
                        >
                          View Order
                        </Button>
                      </Box>
                    </Box>
                  </Box>

                  {/* Order Items */}
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={3}>
                      {order.items.map((item, index) => (
                        <Box key={item.id || index}>
                          <Box sx={{ display: "flex", gap: 3 }}>
                            {/* Product Image */}
                            <Box
                              sx={{
                                width: 120,
                                height: 120,
                                flexShrink: 0,
                                borderRadius: 1,
                                overflow: "hidden",
                                bgcolor: "#f3f4f6",
                                border: "1px solid #e5e7eb"
                              }}
                            >
                              {item.product?.images && item.product.images.length > 0 ? (
                                <img
                                  src={getProductImage(item)}
                                  alt={item.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover"
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder-product.png";
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  <ShoppingBagIcon sx={{ fontSize: 48, color: "#9ca3af" }} />
                                </Box>
                              )}
                            </Box>

                            {/* Product Details */}
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body1"
                                fontWeight={500}
                                sx={{ mb: 1, color: "#111827" }}
                              >
                                {item.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ mb: 2, color: "#6b7280" }}
                              >
                                Return or Replace items: Eligible through{" "}
                                {new Date(new Date(order.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </Typography>
                              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                <Button
                                  startIcon={<RefreshIcon />}
                                  size="small"
                                  component={Link}
                                  href={getProductSlug(item)}
                                  sx={{
                                    textTransform: "none",
                                    color: "#2563eb",
                                    "&:hover": {
                                      bgcolor: "#eff6ff"
                                    }
                                  }}
                                >
                                  Buy it again
                                </Button>
                                <Button
                                  startIcon={<VisibilityIcon />}
                                  size="small"
                                  component={Link}
                                  href={getProductSlug(item)}
                                  sx={{
                                    textTransform: "none",
                                    color: "#2563eb",
                                    "&:hover": {
                                      bgcolor: "#eff6ff"
                                    }
                                  }}
                                >
                                  View Product
                                </Button>
                              </Box>
                            </Box>
                          </Box>

                          {/* Delivery Status */}
                          <Box
                            sx={{
                              mt: 2,
                              pt: 2,
                              borderTop: "1px solid #e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              gap: 1
                            }}
                          >
                            <CheckCircleIcon
                              sx={{
                                fontSize: 20,
                                color: getStatusColor(order.status)
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                color: getStatusColor(order.status),
                                fontWeight: 500
                              }}
                            >
                              {getStatusText(order.status)} {order.status === "FULFILLED" && new Date(order.createdAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric"
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                  </Stack>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

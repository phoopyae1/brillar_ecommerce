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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Chip,
  Snackbar,
  Alert,
  CircularProgress
} from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import InventoryIcon from "@mui/icons-material/Inventory";
import PendingIcon from "@mui/icons-material/Pending";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import Link from "next/link";
import { isAuthenticated, getUser, fetchWithAuth } from "../../../utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TAX_RATE = 0.1; // 10% tax rate

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
      return "Shipped";
    case "READY_TO_SHIP":
      return "Ready to Ship";
    case "PREPARING_TO_SHIP":
      return "Preparing to Ship";
    case "PAID":
      return "Order Confirmed";
    case "PENDING":
      return "Processing";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return "#10b981"; // green
    case "READY_TO_SHIP":
      return "#06b6d4"; // cyan/blue
    case "PREPARING_TO_SHIP":
      return "#f59e0b"; // amber/orange
    case "PAID":
      return "#3b82f6"; // blue
    case "PENDING":
      return "#f59e0b"; // amber
    case "CANCELLED":
      return "#ef4444"; // red
    case "REFUNDED":
      return "#8b5cf6"; // purple
    default:
      return "#6b7280"; // gray
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return <LocalShippingIcon sx={{ fontSize: 20 }} />;
    case "READY_TO_SHIP":
      return <LocalShippingIcon sx={{ fontSize: 20 }} />;
    case "PREPARING_TO_SHIP":
      return <InventoryIcon sx={{ fontSize: 20 }} />;
    case "PAID":
      return <CheckCircleIcon sx={{ fontSize: 20 }} />;
    case "PENDING":
      return <PendingIcon sx={{ fontSize: 20 }} />;
    case "CANCELLED":
      return <CloseIcon sx={{ fontSize: 20 }} />;
    case "REFUNDED":
      return <RefreshIcon sx={{ fontSize: 20 }} />;
    default:
      return <CheckCircleIcon sx={{ fontSize: 20 }} />;
  }
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState(0);
  const [timeFilter, setTimeFilter] = React.useState("1");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = React.useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "success" as "success" | "error" | "warning" | "info" });
  const [buyingAgain, setBuyingAgain] = React.useState<string | null>(null);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setInvoiceDialogOpen(true);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleBuyItAgain = async (order: Order) => {
    const user = getUser();
    if (!user) {
      setSnackbar({ open: true, message: "Please log in to add items to cart", severity: "error" });
      return;
    }

    setBuyingAgain(order.id);
    try {
      const response = await fetchWithAuth(`${API_URL}/api/customer-agent/buy-it-again`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerId: user.id,
          orderId: order.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add items to cart");
      }

      if (data.success) {
        const addedCount = data.addedItems || 0;
        const skippedCount = data.skippedItems || 0;
        
        let message = `Added ${addedCount} item${addedCount !== 1 ? 's' : ''} to your cart`;
        if (skippedCount > 0) {
          message += `. ${skippedCount} item${skippedCount !== 1 ? 's' : ''} could not be added (out of stock or unavailable)`;
        }
        
        setSnackbar({ 
          open: true, 
          message: message, 
          severity: skippedCount > 0 ? "warning" : "success" 
        });
        
        // Dispatch cart updated event to refresh cart count
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        
        // Optionally redirect to cart after a short delay
        setTimeout(() => {
          router.push("/cart");
        }, 1500);
      } else {
        throw new Error("Failed to add items to cart");
      }
    } catch (error: any) {
      console.error("Error buying it again:", error);
      setSnackbar({ 
        open: true, 
        message: error.message || "Failed to add items to cart. Please try again.", 
        severity: "error" 
      });
    } finally {
      setBuyingAgain(null);
    }
  };

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
      // Not Yet Shipped - includes orders being prepared or ready to ship
      filtered = filtered.filter(o => 
        o.status === "PAID" || 
        o.status === "PENDING" || 
        o.status === "PREPARING_TO_SHIP" || 
        o.status === "READY_TO_SHIP"
      );
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
            <Tab label={`Not Yet Shipped (${orders.filter(o => o.status === "PAID" || o.status === "PENDING" || o.status === "PREPARING_TO_SHIP" || o.status === "READY_TO_SHIP").length})`} />
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
                            <strong>Total:</strong> {order.currency} {(Number(order.total) * (1 + TAX_RATE)).toFixed(2)} <Typography component="span" variant="caption" color="text.secondary">(includes tax)</Typography>
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
                          onClick={() => handleViewInvoice(order)}
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
                          onClick={() => handleViewOrder(order)}
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
                                  startIcon={buyingAgain === order.id ? <CircularProgress size={16} /> : <RefreshIcon />}
                                  size="small"
                                  onClick={() => handleBuyItAgain(order)}
                                  disabled={buyingAgain === order.id}
                                  sx={{
                                    textTransform: "none",
                                    color: "#2563eb",
                                    "&:hover": {
                                      bgcolor: "#eff6ff"
                                    },
                                    "&:disabled": {
                                      color: "#9ca3af"
                                    }
                                  }}
                                >
                                  {buyingAgain === order.id ? "Adding to cart..." : "Buy it again"}
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
                            <Box sx={{ color: getStatusColor(order.status) }}>
                              {getStatusIcon(order.status)}
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: getStatusColor(order.status),
                                fontWeight: 500
                              }}
                            >
                              {getStatusText(order.status)} {(order.status === "FULFILLED" || order.status === "READY_TO_SHIP" || order.status === "PREPARING_TO_SHIP") && ` on ${new Date(order.createdAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric"
                              })}`}
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

      {/* Order Details Dialog */}
      <Dialog
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Order Details</Typography>
          <IconButton onClick={() => setOrderDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Order ID</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    #{selectedOrder.id.slice(0, 12).toUpperCase()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Order Date</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {new Date(selectedOrder.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    icon={getStatusIcon(selectedOrder.status)}
                    label={getStatusText(selectedOrder.status)}
                    size="small"
                    sx={{
                      bgcolor: getStatusColor(selectedOrder.status) + "20",
                      color: getStatusColor(selectedOrder.status),
                      border: `1px solid ${getStatusColor(selectedOrder.status)}40`
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedOrder.currency} {(Number(selectedOrder.total) * (1 + TAX_RATE)).toFixed(2)}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (includes tax)
                    </Typography>
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>Order Items</Typography>
              <Stack spacing={2}>
                {selectedOrder.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      gap: 2,
                      p: 2,
                      border: "1px solid #e5e7eb",
                      borderRadius: 1
                    }}
                  >
                    {item.product?.images?.[0] && (
                      <Avatar
                        src={item.product.images[0]}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                      />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quantity: {item.quantity}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Price: {selectedOrder.currency} {Number(item.price).toFixed(2)} each
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedOrder.currency} {(Number(item.price) * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ mt: 3, p: 2, bgcolor: "#f9fafb", borderRadius: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Subtotal (before tax):</Typography>
                  <Typography variant="body2">{selectedOrder.currency} {Number(selectedOrder.total).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Tax (10%):</Typography>
                  <Typography variant="body2">{selectedOrder.currency} {(Number(selectedOrder.total) * TAX_RATE).toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body1" fontWeight={600}>Total:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedOrder.currency} {(Number(selectedOrder.total) * (1 + TAX_RATE)).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Invoice</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton onClick={handlePrintInvoice} size="small" title="Print">
              <PrintIcon />
            </IconButton>
            <IconButton onClick={() => setInvoiceDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                  INVOICE
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Order ID: #{selectedOrder.id.slice(0, 12).toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {new Date(selectedOrder.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>Items</Typography>
              <Box sx={{ mb: 3 }}>
                {selectedOrder.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1.5,
                      borderBottom: "1px solid #e5e7eb"
                    }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} × {selectedOrder.currency} {Number(item.price).toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedOrder.currency} {(Number(item.price) * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 4, p: 3, bgcolor: "#f9fafb", borderRadius: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">{selectedOrder.currency} {Number(selectedOrder.total).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Tax (10%):</Typography>
                  <Typography variant="body2">{selectedOrder.currency} {(Number(selectedOrder.total) * TAX_RATE).toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="h6" fontWeight={600}>Total:</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedOrder.currency} {(Number(selectedOrder.total) * (1 + TAX_RATE)).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #e5e7eb" }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Thank you for your purchase!
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePrintInvoice} startIcon={<PrintIcon />}>
            Print
          </Button>
          <Button onClick={() => setInvoiceDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

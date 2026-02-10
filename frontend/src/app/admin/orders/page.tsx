"use client";

import React from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  Menu,
  Divider,
  FormControl,
  Snackbar,
  Alert
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TAX_RATE = 0.1; // 10% tax rate

type Order = {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  user?: {
    id: string;
    name: string;
    email: string;
  };
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
      return status.replace(/_/g, " ");
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return "success";
    case "READY_TO_SHIP":
      return "info";
    case "PREPARING_TO_SHIP":
      return "warning";
    case "PAID":
      return "primary";
    case "PENDING":
      return "warning";
    case "CANCELLED":
      return "error";
    case "REFUNDED":
      return "error";
    default:
      return "default";
  }
};

const getStatusIcon = (status: string): React.ReactElement | undefined => {
  switch (status) {
    case "FULFILLED":
      return <LocalShippingIcon sx={{ fontSize: 18 }} />;
    case "READY_TO_SHIP":
      return <LocalShippingIcon sx={{ fontSize: 18 }} />;
    case "PREPARING_TO_SHIP":
      return <InventoryIcon sx={{ fontSize: 18 }} />;
    case "PAID":
      return <CheckCircleIcon sx={{ fontSize: 18 }} />;
    case "PENDING":
      return <PendingIcon sx={{ fontSize: 18 }} />;
    case "CANCELLED":
      return <CloseIcon sx={{ fontSize: 18 }} />;
    case "REFUNDED":
      return <RefreshIcon sx={{ fontSize: 18 }} />;
    default:
      return undefined;
  }
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState("");
  const [updating, setUpdating] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ 
    open: boolean; 
    message: string; 
    severity: "success" | "error" | "warning" | "info";
    duration?: number;
  }>({
    open: false,
    message: "",
    severity: "success"
  });

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

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      let accessToken = localStorage.getItem("accessToken");
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      let response = await fetch(`${API_URL}/api/orders/admin/all`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/orders/admin/all`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        } else {
          setLoading(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedOrder here - it's needed for the status dialog
  };

  const handleStatusChangeClick = () => {
    // Keep selectedOrder - don't clear it yet, dialog needs it
    const order = selectedOrder;
    if (order) {
      console.log("Opening status dialog for order:", order.id, "current status:", order.status);
      // Set initial status to current order status
      const currentStatus = order.status || "";
      setNewStatus(currentStatus);
      console.log("Set newStatus to:", currentStatus);
      setStatusDialogOpen(true);
      // Close menu but keep selectedOrder - don't call handleMenuClose
      setAnchorEl(null);
    }
  };

  // Debug: Log when newStatus changes
  React.useEffect(() => {
    console.log("newStatus changed to:", newStatus, "type:", typeof newStatus, "length:", newStatus?.length);
  }, [newStatus]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setSnackbar({
          open: true,
          message: "Please log in to update order status.",
          severity: "error"
        });
        setUpdating(false);
        return;
      }

      let response = await fetch(`${API_URL}/api/orders/admin/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/orders/admin/${orderId}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`
            },
            body: JSON.stringify({ status })
          });
        } else {
          setSnackbar({
            open: true,
            message: "Your session has expired. Please log in again.",
            severity: "error"
          });
          setUpdating(false);
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: Failed to update order status`;
        console.error("Status update failed:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          orderId,
          newStatus: status
        });
        throw new Error(errorMessage);
      }

      const updatedOrder = await response.json();
      console.log("Status updated successfully:", updatedOrder);
      await fetchOrders();
      setSnackbar({
        open: true,
        message: `Order status updated to ${getStatusText(status)} successfully!`,
        severity: "success"
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        orderId,
        status
      });
      
      let errorMessage = error.message || "Failed to update order status. Please try again.";
      
      // Check if it's a migration error and provide helpful message
      if (errorMessage.includes("may not exist in the database enum") || 
          errorMessage.includes("migrations") ||
          errorMessage.includes("PREPARING_TO_SHIP") ||
          errorMessage.includes("READY_TO_SHIP")) {
        errorMessage = `Database migration required! Please run: cd backend && npx prisma migrate deploy && npx prisma generate`;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
        duration: errorMessage.includes("migration") ? 15000 : 6000
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async () => {
    console.log("handleStatusUpdate called with:", { 
      selectedOrder: selectedOrder?.id, 
      newStatus, 
      newStatusType: typeof newStatus,
      newStatusLength: newStatus?.length,
      isEmpty: !newStatus,
      isWhitespace: newStatus?.trim() === ""
    });
    
    if (!selectedOrder) {
      console.error("No selected order");
      setSnackbar({
        open: true,
        message: "No order selected",
        severity: "error"
      });
      return;
    }

    // Validate newStatus - convert to string and trim
    const statusValue = String(newStatus || "").trim();
    if (!statusValue || statusValue === "") {
      console.error("Invalid status value:", { 
        newStatus, 
        statusValue,
        type: typeof newStatus,
        originalValue: newStatus 
      });
      setSnackbar({
        open: true,
        message: "Please select a status from the dropdown",
        severity: "warning"
      });
      return;
    }

    console.log("Updating status via dialog:", { orderId: selectedOrder.id, statusValue });
    try {
      await updateOrderStatus(selectedOrder.id, statusValue);
      // Only close dialog if update was successful
      setStatusDialogOpen(false);
      setNewStatus("");
      // Clear selectedOrder only after successful update
      setTimeout(() => {
        setSelectedOrder(null);
      }, 100);
    } catch (error) {
      // Error is already handled in updateOrderStatus, just log it here
      console.error("Status update failed in handleStatusUpdate:", error);
      // Don't close dialog or clear selectedOrder on error so user can try again
    }
  };

  const handleQuickStatusUpdate = async (order: Order, status: string) => {
    console.log("Quick status update clicked:", { orderId: order.id, status });
    if (updating) {
      console.log("Already updating, ignoring click");
      return;
    }
    await updateOrderStatus(order.id, status);
  };

  // Filter orders based on search query and status
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.user?.name?.toLowerCase().includes(query) ||
      order.user?.email?.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query)
    );
  });

  // Calculate statistics
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED")
    .reduce((sum, order) => sum + (Number(order.total) * (1 + TAX_RATE)), 0);
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const paidOrders = orders.filter((o) => o.status === "PAID").length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatOrderId = (id: string) => {
    return id.substring(0, 8).toUpperCase();
  };

  const handleExportOrders = () => {
    try {
      // Prepare CSV data
      const csvHeaders = [
        "Order ID",
        "Customer Name",
        "Customer Email",
        "Status",
        "Total",
        "Currency",
        "Items Count",
        "Created Date"
      ];

      const csvRows = filteredOrders.map((order) => {
        const items = order.items || [];
        const itemsSummary = items.map((item) => `${item.name} (Qty: ${item.quantity})`).join("; ");
        
        return [
          formatOrderId(order.id),
          order.user?.name || "Unknown",
          order.user?.email || "-",
          order.status,
          (Number(order.total) * (1 + TAX_RATE)).toFixed(2),
          order.currency || "USD",
          items.length.toString(),
          formatDate(order.createdAt)
        ];
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `orders_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting orders:", error);
      setSnackbar({
        open: true,
        message: "Failed to export orders. Please try again.",
        severity: "error"
      });
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage all customer orders
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportOrders}
            disabled={loading || filteredOrders.length === 0}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: "none" }}
          >
            Export CSV
          </Button>
        </Stack>

        {/* Statistics Cards */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: "primary.50",
                    color: "primary.main"
                  }}
                >
                  <ShoppingCartIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {totalOrders}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: "success.50",
                    color: "success.main"
                  }}
                >
                  <AttachMoneyIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    ${totalRevenue.toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: "warning.50",
                    color: "warning.main"
                  }}
                >
                  <PendingIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {pendingOrders}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: "primary.50",
                    color: "primary.main"
                  }}
                >
                  <CheckCircleIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Paid
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {paidOrders}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 3 }}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                placeholder="Search orders by ID, customer name, or email..."
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  )
                }}
                sx={{ flex: 1, maxWidth: { sm: 400 } }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="PENDING">Processing</MenuItem>
                <MenuItem value="PAID">Order Confirmed</MenuItem>
                <MenuItem value="PREPARING_TO_SHIP">Preparing to Ship</MenuItem>
                <MenuItem value="READY_TO_SHIP">Ready to Ship</MenuItem>
                <MenuItem value="FULFILLED">Shipped</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
                <MenuItem value="REFUNDED">Refunded</MenuItem>
              </Select>
            </Stack>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredOrders.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchQuery || statusFilter !== "all"
                    ? "No orders found matching your filters."
                    : "No orders yet."}
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 80 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const statusIcon = getStatusIcon(order.status);
                    return (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: "primary.main"
                          }}
                        >
                          #{formatOrderId(order.id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography fontWeight={600}>
                            {order.user?.name || "Unknown"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {order.user?.email || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>
                          {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          ${(Number(order.total) * (1 + TAX_RATE)).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.currency || "USD"} (includes tax)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={statusIcon}
                          label={getStatusText(order.status)}
                          color={getStatusColor(order.status) as any}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setNewStatus(order.status);
                            setStatusDialogOpen(true);
                          }}
                          sx={{ 
                            fontWeight: 600,
                            cursor: "pointer",
                            "&:hover": {
                              opacity: 0.8
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(order.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ position: "relative", zIndex: 1 }}>
                        <Box 
                          sx={{ 
                            display: "flex", 
                            gap: 0.5, 
                            alignItems: "center", 
                            justifyContent: "center",
                            position: "relative",
                            zIndex: 10
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(order.status === "PAID" || order.status === "PENDING") && (
                            <>
                              <Tooltip title="Mark as Preparing to Ship" arrow>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log("Preparing to Ship clicked for order:", order.id);
                                      handleQuickStatusUpdate(order, "PREPARING_TO_SHIP");
                                    }}
                                    disabled={updating}
                                    sx={{ 
                                      color: "warning.main",
                                      position: "relative",
                                      zIndex: 11,
                                      cursor: updating ? "not-allowed" : "pointer",
                                      "&:hover": { bgcolor: "warning.50" },
                                      "&:disabled": { opacity: 0.5 }
                                    }}
                                  >
                                    <InventoryIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Mark as Ready to Ship" arrow>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log("Ready to Ship clicked for order:", order.id);
                                      handleQuickStatusUpdate(order, "READY_TO_SHIP");
                                    }}
                                    disabled={updating}
                                    sx={{ 
                                      color: "info.main",
                                      position: "relative",
                                      zIndex: 11,
                                      cursor: updating ? "not-allowed" : "pointer",
                                      "&:hover": { bgcolor: "info.50" },
                                      "&:disabled": { opacity: 0.5 }
                                    }}
                                  >
                                    <LocalShippingIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          )}
                          {order.status === "PREPARING_TO_SHIP" && (
                            <Tooltip title="Mark as Ready to Ship" arrow>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Ready to Ship clicked for order:", order.id);
                                    handleQuickStatusUpdate(order, "READY_TO_SHIP");
                                  }}
                                  disabled={updating}
                                  sx={{ 
                                    color: "info.main",
                                    position: "relative",
                                    zIndex: 11,
                                    cursor: updating ? "not-allowed" : "pointer",
                                    "&:hover": { bgcolor: "info.50" },
                                    "&:disabled": { opacity: 0.5 }
                                  }}
                                >
                                  <LocalShippingIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title="More actions" arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMenuOpen(e, order);
                                }}
                                sx={{ 
                                  color: "text.secondary",
                                  position: "relative",
                                  zIndex: 11,
                                  cursor: "pointer"
                                }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Order Actions Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleStatusChangeClick}>
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            Change Status
          </MenuItem>
        </Menu>

        {/* Status Change Dialog */}
        <Dialog 
          open={statusDialogOpen} 
          onClose={() => {
            setStatusDialogOpen(false);
            setNewStatus("");
            // Clear selectedOrder when dialog closes
            setTimeout(() => {
              setSelectedOrder(null);
            }, 200);
          }} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" fontWeight={700}>
                Update Order Status
              </Typography>
              <Tooltip title="Close dialog" arrow enterDelay={100} leaveDelay={0}>
                <IconButton onClick={() => setStatusDialogOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {selectedOrder && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Order ID
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                    #{formatOrderId(selectedOrder.id)}
                  </Typography>
                </Box>
              )}
              <FormControl fullWidth required>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  New Status {newStatus && `(Selected: ${newStatus})`}
                </Typography>
                <Select
                  key={`${selectedOrder?.id}-${statusDialogOpen}`}
                  value={String(newStatus || "")}
                  onChange={(e) => {
                    const value = String(e.target.value || "");
                    console.log("Status Select onChange triggered - value:", value, "type:", typeof value, "length:", value.length);
                    // Always update state, even if empty (to allow proper state tracking)
                    setNewStatus(value);
                    console.log("Successfully set newStatus to:", value);
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        zIndex: 1301
                      }
                    }
                  }}
                  sx={{ bgcolor: "background.paper" }}
                  displayEmpty
                  renderValue={(selected) => {
                    const selectedValue = selected as string;
                    if (!selectedValue || selectedValue === "") {
                      return <em style={{ color: "#999" }}>Select a status</em>;
                    }
                    return getStatusText(selectedValue);
                  }}
                >
                  <MenuItem value="PENDING">Processing</MenuItem>
                  <MenuItem value="PAID">Order Confirmed</MenuItem>
                  <MenuItem value="PREPARING_TO_SHIP">Preparing to Ship</MenuItem>
                  <MenuItem value="READY_TO_SHIP">Ready to Ship</MenuItem>
                  <MenuItem value="FULFILLED">Shipped</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  <MenuItem value="REFUNDED">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={() => {
                setStatusDialogOpen(false);
                setNewStatus("");
                // Clear selectedOrder when canceling
                setTimeout(() => {
                  setSelectedOrder(null);
                }, 200);
              }}
              disabled={updating}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Update button clicked, newStatus:", newStatus, "selectedOrder:", selectedOrder?.id, "typeof:", typeof newStatus, "length:", newStatus?.length);
                handleStatusUpdate();
              }}
              variant="contained"
              disabled={updating || !newStatus || typeof newStatus !== "string" || newStatus.trim() === ""}
              sx={{ 
                textTransform: "none", 
                fontWeight: 600,
                "&:disabled": {
                  opacity: 0.6
                }
              }}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Toast Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={snackbar.duration || 4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </AdminLayout>
  );
}

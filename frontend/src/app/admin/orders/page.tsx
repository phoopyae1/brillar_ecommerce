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
  Divider
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return "success";
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "FULFILLED":
      return <CheckCircleIcon sx={{ fontSize: 18 }} />;
    case "PAID":
      return <CheckCircleIcon sx={{ fontSize: 18 }} />;
    case "PENDING":
      return <PendingIcon sx={{ fontSize: 18 }} />;
    default:
      return null;
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
    setSelectedOrder(null);
  };

  const handleStatusChangeClick = () => {
    if (selectedOrder) {
      setNewStatus(selectedOrder.status);
      setStatusDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        alert("Please log in to update order status.");
        setUpdating(false);
        return;
      }

      let response = await fetch(`${API_URL}/api/orders/admin/${selectedOrder.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/orders/admin/${selectedOrder.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`
            },
            body: JSON.stringify({ status: newStatus })
          });
        } else {
          alert("Your session has expired. Please log in again.");
          setUpdating(false);
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update order status");
      }

      setStatusDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders();
      alert("Order status updated successfully!");
    } catch (error: any) {
      console.error("Error updating order status:", error);
      alert(error.message || "Failed to update order status. Please try again.");
    } finally {
      setUpdating(false);
    }
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
    .reduce((sum, order) => sum + Number(order.total), 0);
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
          Number(order.total).toFixed(2),
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
      alert("Failed to export orders. Please try again.");
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
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PAID">Paid</MenuItem>
                <MenuItem value="FULFILLED">Fulfilled</MenuItem>
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
                  {filteredOrders.map((order) => (
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
                          ${Number(order.total).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.currency || "USD"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(order.status)}
                          label={order.status}
                          color={getStatusColor(order.status) as any}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(order.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Order actions" arrow enterDelay={100} leaveDelay={0}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, order)}
                            sx={{ color: "text.secondary" }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
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
        <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
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
              <TextField
                select
                label="New Status"
                fullWidth
                required
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                SelectProps={{
                  native: true
                }}
              >
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="FULFILLED">Fulfilled</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={() => setStatusDialogOpen(false)}
              disabled={updating}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              variant="contained"
              disabled={updating || !newStatus}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
}

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
  Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import WarningIcon from "@mui/icons-material/Warning";
import CloseIcon from "@mui/icons-material/Close";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type InventoryItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  product: {
    id: string;
    name: string;
  } | null;
  variant: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
  } | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminInventoryPage() {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [adjustStockOpen, setAdjustStockOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [adjustForm, setAdjustForm] = React.useState({
    productId: "",
    variantId: "",
    quantity: "",
    reason: ""
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

  const fetchInventory = React.useCallback(async () => {
    try {
      setLoading(true);
      let accessToken = localStorage.getItem("accessToken");
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      let response = await fetch(`${API_URL}/api/inventory`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/inventory`, {
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
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = React.useCallback(async () => {
    try {
      let accessToken = localStorage.getItem("accessToken");
      
      if (!accessToken) {
        return;
      }

      let response = await fetch(`${API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/products`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        } else {
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setProducts(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchInventory();
    fetchProducts();
  }, [fetchInventory, fetchProducts]);

  const handleAdjustStockClick = () => {
    setAdjustStockOpen(true);
  };

  const handleAdjustStockClose = () => {
    setAdjustStockOpen(false);
    setAdjustForm({
      productId: "",
      variantId: "",
      quantity: "",
      reason: ""
    });
    setError("");
  };

  const handleAdjustStockSubmit = async () => {
    setError("");
    
    if (!adjustForm.productId || !adjustForm.quantity || !adjustForm.reason) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Please log in to adjust inventory.");
        setSubmitting(false);
        return;
      }

      const quantity = parseInt(adjustForm.quantity);
      if (isNaN(quantity)) {
        setError("Quantity must be a valid number");
        setSubmitting(false);
        return;
      }

      let response = await fetch(`${API_URL}/api/inventory/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          productId: adjustForm.productId || undefined,
          variantId: adjustForm.variantId || undefined,
          quantity,
          reason: adjustForm.reason.trim()
        })
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/inventory/adjust`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`
            },
            body: JSON.stringify({
              productId: adjustForm.productId || undefined,
              variantId: adjustForm.variantId || undefined,
              quantity,
              reason: adjustForm.reason.trim()
            })
          });
        } else {
          setError("Your session has expired. Please log in again.");
          setSubmitting(false);
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to adjust inventory");
      }

      // Success - close dialog and refresh
      handleAdjustStockClose();
      alert("Stock adjusted successfully!");
      fetchInventory();
    } catch (err: any) {
      console.error("Error adjusting inventory:", err);
      setError(err.message || "Failed to adjust inventory. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter inventory based on search
  const filteredInventory = inventory.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const productName = item.product?.name?.toLowerCase() || "";
    const sku = item.variant?.sku?.toLowerCase() || "";
    return productName.includes(query) || sku.includes(query);
  });

  // Calculate statistics
  const totalItems = filteredInventory.length;
  const lowStockItems = filteredInventory.filter(
    (item) => (item.quantityOnHand - item.quantityReserved) < 10
  ).length;
  const totalOnHand = filteredInventory.reduce(
    (sum, item) => sum + item.quantityOnHand,
    0
  );
  const totalReserved = filteredInventory.reduce(
    (sum, item) => sum + item.quantityReserved,
    0
  );
  const totalAvailable = totalOnHand - totalReserved;

  const getStatusChip = (available: number) => {
    if (available < 10) {
      return <Chip label="Low Stock" color="error" size="small" sx={{ fontWeight: 600 }} />;
    } else if (available < 20) {
      return <Chip label="Medium" color="warning" size="small" sx={{ fontWeight: 600 }} />;
    }
    return <Chip label="In Stock" color="success" size="small" sx={{ fontWeight: 600 }} />;
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
              Inventory Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track and manage product stock levels
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdjustStockClick}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: "none" }}
          >
            Adjust Stock
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
                  <InventoryIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Items
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {totalItems}
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
                  <TrendingUpIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Available Stock
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {totalAvailable}
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
                  <TrendingDownIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Reserved
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {totalReserved}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, borderRadius: 2, border: lowStockItems > 0 ? "2px solid" : "1px solid", borderColor: lowStockItems > 0 ? "error.main" : "divider" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: lowStockItems > 0 ? "error.50" : "grey.50",
                    color: lowStockItems > 0 ? "error.main" : "text.secondary"
                  }}
                >
                  <WarningIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Low Stock
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={lowStockItems > 0 ? "error.main" : "text.primary"}>
                    {lowStockItems}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                placeholder="Search inventory by product name or SKU..."
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
                sx={{ maxWidth: 400 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredInventory.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchQuery ? "No inventory items found matching your search." : "No inventory items found."}
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">On Hand</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Reserved</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Available</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const available = item.quantityOnHand - item.quantityReserved;
                    const productName = item.product?.name || "Unknown Product";
                    const sku = item.variant?.sku || (item.productId ? "N/A" : "");
                    
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{productName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {sku || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>{item.quantityOnHand}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="warning.main" fontWeight={600}>
                            {item.quantityReserved}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                            <Typography
                              fontWeight={600}
                              color={available < 10 ? "error.main" : available < 20 ? "warning.main" : "success.main"}
                            >
                              {available}
                            </Typography>
                            {available < 10 && (
                              <Tooltip title="Low stock warning" arrow enterDelay={100} leaveDelay={0}>
                                <WarningIcon sx={{ fontSize: 18, color: "error.main" }} />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(available)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Adjust Stock Dialog */}
        <Dialog open={adjustStockOpen} onClose={handleAdjustStockClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" fontWeight={700}>
                Adjust Stock
              </Typography>
              <Tooltip title="Close dialog" arrow enterDelay={100} leaveDelay={0}>
                <IconButton onClick={handleAdjustStockClose} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                select
                label="Product"
                fullWidth
                required
                value={adjustForm.productId}
                onChange={(e) => {
                  setAdjustForm({ ...adjustForm, productId: e.target.value, variantId: "" });
                }}
                SelectProps={{
                  native: true
                }}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </TextField>
              <TextField
                label="Quantity Change"
                type="number"
                fullWidth
                required
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                helperText="Use positive number to add stock, negative to subtract"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {parseInt(adjustForm.quantity) >= 0 ? (
                        <TrendingUpIcon sx={{ color: "success.main" }} />
                      ) : (
                        <TrendingDownIcon sx={{ color: "error.main" }} />
                      )}
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="Reason"
                fullWidth
                required
                multiline
                rows={3}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g., Restocked, Damaged items, Returned goods, Inventory count..."
              />
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={handleAdjustStockClose} 
              disabled={submitting}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustStockSubmit}
              variant="contained"
              disabled={submitting}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {submitting ? "Adjusting..." : "Adjust Stock"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
}

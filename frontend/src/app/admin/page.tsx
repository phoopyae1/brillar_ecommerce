"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { AdminLayout } from "../../components/AdminLayout";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import WarningIcon from "@mui/icons-material/Warning";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { isAuthenticated, isAdmin } from "../../utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = React.useState(true);
  const [metrics, setMetrics] = React.useState([
    { label: "Total Orders", value: "0", change: "0%", icon: <ShoppingCartIcon />, color: "primary" },
    { label: "Revenue", value: "$0", change: "0%", icon: <AttachMoneyIcon />, color: "success" },
    { label: "Products", value: "0", change: "0", icon: <InventoryIcon />, color: "info" },
    { label: "Low Stock", value: "0", change: "Items", icon: <WarningIcon />, color: "warning" }
  ]);
  const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [salesData, setSalesData] = React.useState<any[]>([]);
  const [revenueData, setRevenueData] = React.useState<any[]>([]);
  const [statusData, setStatusData] = React.useState<any[]>([]);
  const [allOrders, setAllOrders] = React.useState<any[]>([]);

  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  };

  React.useEffect(() => {
    // Check authentication and admin status
    if (!isAuthenticated() || !isAdmin()) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.push("/");
      return;
    }
    setIsChecking(false);

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        let accessToken = localStorage.getItem("accessToken");
        if (!accessToken) return;

        // Fetch all orders (admin endpoint)
        let ordersResponse = await fetch(`${API_URL}/api/orders/admin/all`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (ordersResponse.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            ordersResponse = await fetch(`${API_URL}/api/orders/admin/all`, {
              headers: { Authorization: `Bearer ${newToken}` }
            });
          }
        }
        const orders = ordersResponse.ok ? await ordersResponse.json() : [];
        const ordersArray = Array.isArray(orders) ? orders : [];
        setAllOrders(ordersArray);

        // Fetch products
        const productsResponse = await fetch(`${API_URL}/api/products`);
        const productsData = productsResponse.ok ? await productsResponse.json() : { items: [] };
        const products = Array.isArray(productsData) ? productsData : (productsData.items || []);

        // Fetch inventory for low stock items
        let inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (inventoryResponse.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
              headers: { Authorization: `Bearer ${newToken}` }
            });
          }
        }
        const inventoryData = inventoryResponse.ok ? await inventoryResponse.json() : [];
        const inventory = Array.isArray(inventoryData) ? inventoryData : [];

        // Calculate metrics
        const totalOrders = ordersArray.length;
        const totalRevenue = ordersArray.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
        const totalProducts = products.length;
        const lowStock = inventory.filter((inv: any) => inv.quantityOnHand < 10).length;

        setMetrics([
          {
            label: "Total Orders",
            value: totalOrders.toLocaleString(),
            change: "+0%",
            icon: <ShoppingCartIcon />,
            color: "primary"
          },
          {
            label: "Revenue",
            value: `$${totalRevenue.toFixed(2)}`,
            change: "+0%",
            icon: <AttachMoneyIcon />,
            color: "success"
          },
          {
            label: "Products",
            value: totalProducts.toLocaleString(),
            change: "0",
            icon: <InventoryIcon />,
            color: "info"
          },
          {
            label: "Low Stock",
            value: lowStock.toString(),
            change: "Items",
            icon: <WarningIcon />,
            color: "warning"
          }
        ]);

        // Get recent orders (last 5)
        const recent = ordersArray
          .slice(0, 5)
          .map((order: any) => ({
            id: order.id.slice(0, 8).toUpperCase(),
            customer: order.user?.email || "Unknown",
            amount: `$${Number(order.total).toFixed(2)}`,
            status: order.status,
            time: new Date(order.createdAt).toLocaleDateString()
          }));
        setRecentOrders(recent);

        // Get low stock products
        const lowStockItems = inventory
          .filter((inv: any) => inv.quantityOnHand < 10)
          .slice(0, 4)
          .map((inv: any) => {
            const product = products.find((p: any) => p.id === inv.productId);
            const variant = product?.variants?.find((v: any) => v.id === inv.variantId);
            return {
              name: product?.name || "Unknown Product",
              stock: inv.quantityOnHand,
              sku: variant?.sku || inv.productId?.slice(0, 8) || "N/A"
            };
          });
        setLowStockProducts(lowStockItems);

        // Prepare sales chart data (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split("T")[0];
        });

        const salesByDate = last7Days.map((date) => {
          const dayOrders = ordersArray.filter((order: any) => {
            const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
            return orderDate === date;
          });
          return {
            date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            orders: dayOrders.length,
            revenue: dayOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0)
          };
        });
        setSalesData(salesByDate);

        // Prepare revenue chart data (last 30 days grouped by week)
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return date.toISOString().split("T")[0];
        });

        const weeklyRevenue = [];
        for (let i = 0; i < 30; i += 7) {
          const weekStart = last30Days[i];
          const weekEnd = last30Days[Math.min(i + 6, 29)];
          const weekOrders = ordersArray.filter((order: any) => {
            const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
            return orderDate >= weekStart && orderDate <= weekEnd;
          });
          weeklyRevenue.push({
            week: `Week ${Math.floor(i / 7) + 1}`,
            revenue: weekOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0),
            orders: weekOrders.length
          });
        }
        setRevenueData(weeklyRevenue);

        // Prepare status distribution data
        const statusCounts: { [key: string]: number } = {};
        ordersArray.forEach((order: any) => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });
        const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count
        }));
        setStatusData(statusChartData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (isChecking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <AdminLayout>
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's an overview of your store performance.
          </Typography>
        </Box>

        {/* Metrics Cards - Clean and Simple */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {metrics.map((metric) => (
            <Grid item xs={12} sm={6} md={3} key={metric.label}>
              <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: `${metric.color}.50`,
                        color: `${metric.color}.main`,
                        flexShrink: 0
                      }}
                    >
                      {metric.icon}
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {metric.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {metric.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metric.change}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Sales Overview Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Sales Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Sales Trend (Last 7 Days)
                  </Typography>
                </Box>
                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                    <Typography>Loading chart data...</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="#2563eb"
                        fillOpacity={1}
                        fill="url(#colorOrders)"
                        name="Orders"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Order Status Distribution */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Order Status
                </Typography>
                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                    <Typography>Loading...</Typography>
                  </Box>
                ) : statusData.length === 0 ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                    <Typography color="text.secondary">No data available</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Revenue Chart */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                  <AttachMoneyIcon color="success" />
                  <Typography variant="h6" fontWeight={600}>
                    Revenue Overview (Last 4 Weeks)
                  </Typography>
                </Box>
                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                    <Typography>Loading chart data...</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px"
                        }}
                        formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="orders" fill="#2563eb" name="Orders" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Recent Orders - Table Style */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Recent Orders
                  </Typography>
                  <Button
                    component={Link}
                    href="/admin/orders"
                    endIcon={<ArrowForwardIcon />}
                    size="small"
                    sx={{ textTransform: "none" }}
                  >
                    View All
                  </Button>
                </Box>
                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Typography>Loading...</Typography>
                  </Box>
                ) : recentOrders.length === 0 ? (
                  <Box sx={{ textAlign: "center", p: 4 }}>
                    <Typography color="text.secondary">No orders yet</Typography>
                  </Box>
                ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{order.amount}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            size="small"
                            color={
                                order.status === "PAID"
                                ? "success"
                                  : order.status === "PENDING"
                                ? "warning"
                                  : order.status === "FULFILLED"
                                  ? "primary"
                                : "default"
                            }
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{order.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Low Stock Items - Simple List */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                  <WarningIcon color="warning" />
                  <Typography variant="h6" fontWeight={600}>
                    Low Stock Items
                  </Typography>
                </Box>
                {loading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <Typography>Loading...</Typography>
                  </Box>
                ) : lowStockProducts.length === 0 ? (
                  <Box sx={{ textAlign: "center", p: 4 }}>
                    <Typography color="text.secondary">No low stock items</Typography>
                  </Box>
                ) : (
                <Stack spacing={2}>
                  {lowStockProducts.map((product) => (
                    <Box
                      key={product.sku}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: product.stock < 5 ? "error.50" : "warning.50",
                        border: "1px solid",
                        borderColor: product.stock < 5 ? "error.200" : "warning.200"
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="error.main">
                          {product.stock} left
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        SKU: {product.sku}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                )}
                <Button
                  component={Link}
                  href="/admin/inventory"
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 3, textTransform: "none", fontWeight: 600 }}
                >
                  Manage Inventory
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
}

"use client";

import { AdminLayout } from "../../../components/AdminLayout";
import { Box, Button, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const rows = [
  {
    id: "1",
    name: "Aurora Sneakers",
    status: "ACTIVE",
    price: 129.99,
    category: "Footwear"
  },
  {
    id: "2",
    name: "Lumen Jacket",
    status: "DRAFT",
    price: 199.0,
    category: "Outerwear"
  }
];

const columns: GridColDef[] = [
  { field: "name", headerName: "Product", flex: 1 },
  { field: "category", headerName: "Category", flex: 1 },
  { field: "status", headerName: "Status", width: 130 },
  { field: "price", headerName: "Price", width: 120 }
];

export default function AdminProductsPage() {
  return (
    <AdminLayout>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Products
        </Typography>
        <Button variant="contained">Add product</Button>
      </Stack>
      <Box sx={{ height: 420 }}>
        <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick />
      </Box>
    </AdminLayout>
  );
}

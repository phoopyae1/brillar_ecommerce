"use client";

import { AdminLayout } from "../../../components/AdminLayout";
import { Box, Button, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const rows = [
  {
    id: "1",
    product: "Aurora Sneakers",
    sku: "AUR-SNK-8-BLK",
    onHand: 50,
    reserved: 3
  },
  {
    id: "2",
    product: "Lumen Jacket",
    sku: "LUM-JKT-01",
    onHand: 12,
    reserved: 1
  }
];

const columns: GridColDef[] = [
  { field: "product", headerName: "Product", flex: 1 },
  { field: "sku", headerName: "SKU", flex: 1 },
  { field: "onHand", headerName: "On hand", width: 130 },
  { field: "reserved", headerName: "Reserved", width: 130 }
];

export default function AdminInventoryPage() {
  return (
    <AdminLayout>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Inventory
        </Typography>
        <Button variant="outlined">Adjust stock</Button>
      </Stack>
      <Box sx={{ height: 420 }}>
        <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick />
      </Box>
    </AdminLayout>
  );
}

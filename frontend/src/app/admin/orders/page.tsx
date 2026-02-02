"use client";

import { AdminLayout } from "../../../components/AdminLayout";
import { Box, Button, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const rows = [
  {
    id: "ord_1",
    customer: "Jamie Lee",
    status: "PAID",
    total: 328.99,
    createdAt: "2024-07-10"
  },
  {
    id: "ord_2",
    customer: "Alex Ray",
    status: "PENDING",
    total: 129.99,
    createdAt: "2024-07-11"
  }
];

const columns: GridColDef[] = [
  { field: "id", headerName: "Order ID", flex: 1 },
  { field: "customer", headerName: "Customer", flex: 1 },
  { field: "status", headerName: "Status", width: 140 },
  { field: "total", headerName: "Total", width: 140 },
  { field: "createdAt", headerName: "Created", width: 140 }
];

export default function AdminOrdersPage() {
  return (
    <AdminLayout>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Orders
        </Typography>
        <Button variant="outlined">Export</Button>
      </Stack>
      <Box sx={{ height: 420 }}>
        <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick />
      </Box>
    </AdminLayout>
  );
}

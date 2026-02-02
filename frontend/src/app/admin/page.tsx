import { Card, CardContent, Grid, Typography } from "@mui/material";
import { AdminLayout } from "../../components/AdminLayout";

const metrics = [
  { label: "Total Orders", value: "1,248" },
  { label: "Revenue", value: "$182,400" },
  { label: "Low Stock Items", value: "12" }
];

export default function AdminPage() {
  return (
    <AdminLayout>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Admin Dashboard
      </Typography>
      <Grid container spacing={3}>
        {metrics.map((metric) => (
          <Grid item xs={12} md={4} key={metric.label}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{metric.label}</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </AdminLayout>
  );
}

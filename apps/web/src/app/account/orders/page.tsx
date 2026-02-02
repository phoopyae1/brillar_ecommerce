import { Card, CardContent, Container, Stack, Typography } from "@mui/material";

const orders = [
  { id: "ord_1", status: "PAID", total: 328.99 },
  { id: "ord_2", status: "FULFILLED", total: 129.99 }
];

export default function OrdersPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Order History
      </Typography>
      <Stack spacing={2}>
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight={600}>{order.id}</Typography>
              <Typography>{order.status}</Typography>
              <Typography fontWeight={600}>${order.total.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}

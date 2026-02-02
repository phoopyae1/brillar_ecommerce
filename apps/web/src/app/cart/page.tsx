import { Box, Button, Card, CardContent, Container, Stack, Typography } from "@mui/material";

const sampleCart = [
  { id: "1", name: "Aurora Sneakers", quantity: 1, price: 129.99 },
  { id: "2", name: "Lumen Jacket", quantity: 1, price: 199.0 }
];

export default function CartPage() {
  const total = sampleCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Your Cart
      </Typography>
      <Stack spacing={2}>
        {sampleCart.map((item) => (
          <Card key={item.id}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography fontWeight={600}>{item.name}</Typography>
                <Typography color="text.secondary">Qty: {item.quantity}</Typography>
              </Box>
              <Typography fontWeight={600}>${item.price.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
        <Typography variant="h6">Total</Typography>
        <Typography variant="h6">${total.toFixed(2)}</Typography>
      </Box>
      <Button variant="contained" sx={{ mt: 3 }} href="/checkout">
        Proceed to checkout
      </Button>
    </Container>
  );
}

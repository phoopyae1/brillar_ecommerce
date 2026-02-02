import { Box, Button, Container, TextField, Typography } from "@mui/material";

export default function CheckoutPage() {
  return (
    <Container sx={{ py: 6, maxWidth: 600 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Checkout
      </Typography>
      <Box sx={{ display: "grid", gap: 2 }}>
        <TextField label="Full name" fullWidth />
        <TextField label="Email" fullWidth />
        <TextField label="Shipping address" fullWidth />
        <TextField label="City" fullWidth />
        <TextField label="Postal code" fullWidth />
      </Box>
      <Button variant="contained" sx={{ mt: 3 }}>
        Pay & place order
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Payments are simulated in this demo.
      </Typography>
    </Container>
  );
}

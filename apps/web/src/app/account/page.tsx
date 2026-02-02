import { Container, Typography } from "@mui/material";

export default function AccountPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Your Orders
      </Typography>
      <Typography color="text.secondary">
        Sign in to view your order history.
      </Typography>
    </Container>
  );
}

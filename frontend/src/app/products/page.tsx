import { Box, Container, Grid, TextField, Typography } from "@mui/material";
import { ProductCard } from "../../components/ProductCard";

const sampleProducts = [
  {
    id: "1",
    name: "Aurora Sneakers",
    price: 129.99,
    image: "https://images.example.com/sneakers.jpg",
    category: "Footwear"
  },
  {
    id: "2",
    name: "Lumen Jacket",
    price: 199.0,
    image: "https://images.example.com/jacket.jpg",
    category: "Outerwear"
  },
  {
    id: "3",
    name: "Nova Backpack",
    price: 89.5,
    image: "https://images.example.com/backpack.jpg",
    category: "Accessories"
  }
];

export default function ProductsPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Shop Products
        </Typography>
        <TextField
          placeholder="Search products"
          fullWidth
          size="small"
          sx={{ maxWidth: 400 }}
        />
      </Box>
      <Grid container spacing={3}>
        {sampleProducts.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

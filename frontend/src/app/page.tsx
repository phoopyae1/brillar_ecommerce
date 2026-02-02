import { Box, Button, Container, Grid, Typography } from "@mui/material";
import { ProductCard } from "../components/ProductCard";

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

export default function HomePage() {
  return (
    <Box>
      <Box
        sx={{
          background:
            "linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(248, 250, 252, 1) 45%, rgba(15, 23, 42, 0.04) 100%)",
          py: { xs: 6, md: 10 }
        }}
      >
        <Container>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Premium essentials for modern living.
          </Typography>
          <Typography variant="h6" color="text.secondary" maxWidth={520}>
            Discover curated products, real-time inventory, and a seamless checkout
            experience.
          </Typography>
          <Button
            variant="contained"
            size="large"
            color="warning"
            sx={{ mt: 4, boxShadow: "0px 10px 20px rgba(245, 158, 11, 0.35)" }}
            href="/products"
          >
            Shop new arrivals
          </Button>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h5" fontWeight={600}>
            Featured Products
          </Typography>
          <Button href="/products" color="primary">
            View all
          </Button>
        </Box>
        <Grid container spacing={3}>
          {sampleProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

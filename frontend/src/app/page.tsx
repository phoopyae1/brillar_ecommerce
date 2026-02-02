import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
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
    <Box sx={{ bgcolor: "#f8fafc" }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 45%), #0f172a",
          color: "common.white",
          py: { xs: 8, md: 12 }
        }}
      >
        <Container>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Typography variant="overline" letterSpacing={3} sx={{ opacity: 0.7 }}>
                  BRILLAR ECOMMERCE
                </Typography>
                <Typography variant="h2" fontWeight={700}>
                  Modern essentials curated for effortless living.
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.75 }}>
                  Discover limited drops, verified reviews, and flexible delivery
                  windows tailored to your pace.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button variant="contained" size="large" href="/products">
                    Shop new arrivals
                  </Button>
                  <Button variant="outlined" size="large" href="/products">
                    Explore the catalog
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 6,
                  p: { xs: 3, md: 4 },
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)"
                }}
              >
                <Stack spacing={3}>
                  <Typography variant="h5" fontWeight={600}>
                    Ready when you are
                  </Typography>
                  <Stack spacing={2}>
                    {[
                      {
                        title: "Personalized picks",
                        description: "AI-powered recommendations updated daily."
                      },
                      {
                        title: "Concierge delivery",
                        description: "Same-day options in 30+ cities."
                      },
                      {
                        title: "Member rewards",
                        description: "Earn points for every purchase and review."
                      }
                    ].map((item) => (
                      <Box key={item.title}>
                        <Typography fontWeight={600}>{item.title}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          {item.description}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={3}>
          {[
            { label: "Curated brands", value: "120+" },
            { label: "Same-day delivery", value: "24H" },
            { label: "Customer rating", value: "4.9/5" }
          ].map((stat) => (
            <Grid item xs={12} md={4} key={stat.label}>
              <Box
                sx={{
                  bgcolor: "common.white",
                  borderRadius: 4,
                  p: 3,
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)"
                }}
              >
                <Typography variant="h4" fontWeight={700}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Container sx={{ pb: { xs: 6, md: 10 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Featured this week
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Elevated staples chosen for their design and durability.
            </Typography>
          </Box>
          <Button variant="text" href="/products">
            View all products
          </Button>
        </Stack>
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

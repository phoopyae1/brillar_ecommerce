"use client";

import React from "react";
import { Box, Button, Container, Grid, Stack, Typography, CircularProgress } from "@mui/material";
import { ProductCard } from "../components/ProductCard";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SecurityIcon from "@mui/icons-material/Security";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  status: string;
};

const features = [
  {
    icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
    title: "Free Shipping",
    description: "On orders over $100"
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: "Secure Payment",
    description: "100% secure checkout"
  },
  {
    icon: <SupportAgentIcon sx={{ fontSize: 40 }} />,
    title: "24/7 Support",
    description: "Dedicated support team"
  }
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/products?status=ACTIVE&pageSize=3&sort=createdAt&order=desc`);
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        // Convert relative image URLs to absolute URLs
        const productsWithAbsoluteUrls = (data.items || []).map((product: Product) => ({
          ...product,
          images: product.images?.map((img: string) => {
            if (img.startsWith("/")) {
              return `${API_URL}${img}`;
            }
            return img;
          }) || []
        }));
        console.log("Featured products with converted image URLs:", productsWithAbsoluteUrls);
        setFeaturedProducts(productsWithAbsoluteUrls);
      } catch (error) {
        console.error("Error fetching featured products:", error);
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(248, 250, 252, 1) 50%, rgba(15, 23, 42, 0.04) 100%)",
          py: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden"
        }}
      >
        <Container>
          <Stack spacing={3} sx={{ maxWidth: 700 }}>
            <Typography
              variant="h2"
              fontWeight={700}
              sx={{
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                lineHeight: 1.2,
                background: "linear-gradient(135deg, #2563EB 0%, #1E293B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Premium essentials for modern living
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontSize: { xs: "1rem", md: "1.25rem" }, lineHeight: 1.6 }}
            >
              Discover curated products, real-time inventory, and a seamless checkout
              experience designed for the modern shopper.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                href="/products"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  boxShadow: "0px 10px 30px rgba(37, 99, 235, 0.3)"
                }}
              >
                Shop Now
              </Button>
              <Button
                variant="outlined"
                size="large"
                href="/products"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 }
                }}
              >
                Browse Collection
              </Button>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 6, backgroundColor: "background.default" }}>
        <Container>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box
                  sx={{
                    textAlign: "center",
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: "background.paper",
                    height: "100%",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "translateY(-4px)" }
                  }}
                >
                  <Box sx={{ color: "primary.main", mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Featured Products */}
      <Container sx={{ py: 8 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            Featured Products
          </Typography>
          <Button
            href="/products"
            endIcon={<ArrowForwardIcon />}
            sx={{ fontWeight: 600 }}
          >
            View All
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : featuredProducts.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            No featured products available
          </Typography>
        ) : (
          <Grid container spacing={4}>
            {featuredProducts.map((product) => {
              // Ensure image URL is absolute
              let imageUrl = "https://via.placeholder.com/400";
              if (product.images && product.images.length > 0) {
                imageUrl = product.images[0];
                // If relative URL, convert to absolute
                if (imageUrl.startsWith("/")) {
                  imageUrl = `${API_URL}${imageUrl}`;
                }
              }
              
              return (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <ProductCard
                    product={{
                      id: product.id,
                      name: product.name,
                      price: Number(product.price),
                      image: imageUrl,
                      category: product.category
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

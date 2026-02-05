"use client";

import React from "react";
import {
  Box,
  Card,
  Chip,
  Container,
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress
} from "@mui/material";
import { ProductCard } from "../../components/ProductCard";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import TuneIcon from "@mui/icons-material/Tune";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  status: string;
};

const categories = ["All", "Footwear", "Outerwear", "Accessories"];

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("price-low");

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("status", "ACTIVE");
        if (selectedCategory !== "All") {
          params.append("category", selectedCategory);
        }
        if (searchQuery) {
          params.append("q", searchQuery);
        }
        
        // Set sort parameters
        if (sortBy === "price-low") {
          params.append("sort", "price");
          params.append("order", "asc");
        } else if (sortBy === "price-high") {
          params.append("sort", "price");
          params.append("order", "desc");
        } else if (sortBy === "newest") {
          params.append("sort", "createdAt");
          params.append("order", "desc");
        }

        const response = await fetch(`${API_URL}/api/products?${params.toString()}`);
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
        console.log("Products with converted image URLs:", productsWithAbsoluteUrls);
        setProducts(productsWithAbsoluteUrls);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, selectedCategory, sortBy]);
  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", pb: 8 }}>
      <Container sx={{ py: 6 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Shop Products
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Discover our curated collection of premium products
          </Typography>
        </Box>

        {/* Filters */}
        <Card sx={{ p: 3, mb: 4 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              placeholder="Search products..."
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon sx={{ ml: 1, color: "text.secondary" }} />
                  </InputAdornment>
                }
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <TuneIcon sx={{ ml: 1, color: "text.secondary" }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="price-low">Price: Low to High</MenuItem>
                <MenuItem value="price-high">Price: High to Low</MenuItem>
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="popular">Most Popular</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Card>

        {/* Results Count */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? "Loading..." : `Showing ${products.length} products`}
          </Typography>
          <Stack direction="row" spacing={1}>
            {categories.slice(1).map((cat) => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                variant={selectedCategory === cat ? "filled" : "outlined"}
                onClick={() => setSelectedCategory(cat === selectedCategory ? "All" : cat)}
                sx={{ borderRadius: 2, cursor: "pointer" }}
              />
            ))}
          </Stack>
        </Box>

        {/* Products Grid */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 ? (
          <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              No products found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your search or filters
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={4}>
            {products.map((product) => {
              // Ensure image URL is absolute
              let imageUrl = "https://via.placeholder.com/400";
              if (product.images && product.images.length > 0) {
                imageUrl = product.images[0];
                console.log(`Product ${product.name} - Original image URL:`, imageUrl);
                // If relative URL, convert to absolute
                if (imageUrl.startsWith("/")) {
                  imageUrl = `${API_URL}${imageUrl}`;
                  console.log(`Product ${product.name} - Converted to absolute URL:`, imageUrl);
                }
              } else {
                console.log(`Product ${product.name} - No images, using placeholder`);
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

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
  CircularProgress,
  Button,
  Tabs,
  Tab
} from "@mui/material";
import { ProductCard } from "../../components/ProductCard";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import TuneIcon from "@mui/icons-material/Tune";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  status: string;
  createdAt?: string;
};

type TabPanelProps = {
  children?: React.ReactNode;
  index: number;
  value: number;
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`products-tabpanel-${index}`}
      aria-labelledby={`products-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ProductsPage() {
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("newest");
  const [tabValue, setTabValue] = React.useState(0);

  // Fetch all products and categories with retry logic
  const fetchProducts = React.useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching products from:", `${API_URL}/api/products?status=ACTIVE&pageSize=1000`);
      
      const response = await fetch(`${API_URL}/api/products?status=ACTIVE&pageSize=1000`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        if (retryCount < 3) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Rate limited. Retrying after ${waitTime}ms... (attempt ${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return fetchProducts(retryCount + 1);
        } else {
          throw new Error("Too many requests. Please wait a moment and try again.");
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch products:", response.status, errorText);
        throw new Error(`Failed to fetch products (${response.status}): ${errorText || "Unknown error"}`);
      }
      
      const data = await response.json();
      console.log("Products fetched successfully:", data);
      
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
      
      console.log("Products with converted URLs:", productsWithAbsoluteUrls.length);
      setAllProducts(productsWithAbsoluteUrls);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(productsWithAbsoluteUrls.map((p: Product) => p.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories.sort());
      setError(null);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      const errorMessage = error.message || "Unable to connect to the server. Please check if the backend is running.";
      setError(errorMessage);
      setAllProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter and sort products
  React.useEffect(() => {
    let filtered = [...allProducts];

    // Apply category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (tabValue === 1) {
      // Latest & Greatest - newest products
      filtered = filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (tabValue === 2) {
      // Bestsellers - could be sorted by price or kept as is
      // For now, we'll show all products
    }

    // Apply sort
    if (sortBy === "price-low") {
      filtered = filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered = filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      filtered = filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === "name") {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredProducts(filtered);
  }, [allProducts, selectedCategory, searchQuery, sortBy, tabValue]);

  // Get featured products for sections
  const latestProducts = React.useMemo(() => {
    return [...allProducts]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 8);
  }, [allProducts]);

  const getCategoryProducts = (category: string, limit: number = 4) => {
    return allProducts
      .filter((p) => p.category === category)
      .slice(0, limit);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", pb: 8 }}>
      <Container sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 6, textAlign: "center" }}>
          <Typography
            variant="h2"
            fontWeight={700}
            gutterBottom
            sx={{
              fontSize: { xs: "2rem", md: "3rem" },
              background: "linear-gradient(135deg, #2563EB 0%, #1E293B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Explore Our Products
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2, maxWidth: 600, mx: "auto" }}>
            Discover our curated collection of premium products, handpicked for quality and style
          </Typography>
        </Box>

        {/* Category Navigation */}
        {categories.length > 0 && (
          <Box sx={{ mb: 4, overflowX: "auto" }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                pb: 2,
                "&::-webkit-scrollbar": {
                  height: 8
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "grey.100"
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "grey.400",
                  borderRadius: 4
                }
              }}
            >
              <Chip
                label="All Categories"
                onClick={() => setSelectedCategory("All")}
                color={selectedCategory === "All" ? "primary" : "default"}
                sx={{
                  px: 2,
                  py: 3,
                  fontSize: "0.95rem",
                  fontWeight: selectedCategory === "All" ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              />
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setSelectedCategory(cat)}
                  color={selectedCategory === cat ? "primary" : "default"}
                  sx={{
                    px: 2,
                    py: 3,
                    fontSize: "0.95rem",
                    fontWeight: selectedCategory === cat ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Search and Filters */}
        <Card
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)"
          }}
        >
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
            <FormControl sx={{ minWidth: { xs: "100%", md: 200 } }}>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon sx={{ ml: 1, color: "text.secondary" }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="All">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: { xs: "100%", md: 200 } }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <TuneIcon sx={{ ml: 1, color: "text.secondary" }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="price-low">Price: Low to High</MenuItem>
                <MenuItem value="price-high">Price: High to Low</MenuItem>
                <MenuItem value="name">Name: A to Z</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Card>

        {/* Tabs for Featured Sections */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="product sections"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
                minHeight: 60
              }
            }}
          >
            <Tab label="All Products" />
            <Tab label="Latest & Greatest" />
            <Tab label="Bestsellers" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Results Count */}
          <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              {loading ? "Loading..." : `Showing ${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
            </Typography>
          </Box>

          {/* Products Grid */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : allProducts.length === 0 && error ? (
            <Card
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: 6,
                textAlign: "center"
              }}
            >
              <Typography variant="h5" color="error" gutterBottom>
                Unable to load products
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                {error}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                API URL: {API_URL}
              </Typography>
              <Button
                variant="contained"
                onClick={() => fetchProducts()}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: 6,
                textAlign: "center"
              }}
            >
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No products found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search or filters
              </Typography>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {filteredProducts.map((product) => {
                let imageUrl = "https://via.placeholder.com/400";
                if (product.images && product.images.length > 0) {
                  imageUrl = product.images[0];
                  if (imageUrl.startsWith("/")) {
                    imageUrl = `${API_URL}${imageUrl}`;
                  }
                }

                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
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
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Latest & Greatest Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h4" fontWeight={700}>
                Latest & Greatest
              </Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                sx={{ fontWeight: 600, textTransform: "none" }}
                onClick={() => {
                  setTabValue(0);
                  setSortBy("newest");
                }}
              >
                View All
              </Button>
            </Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : latestProducts.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                No products available
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {latestProducts.map((product) => {
                  let imageUrl = "https://via.placeholder.com/400";
                  if (product.images && product.images.length > 0) {
                    imageUrl = product.images[0];
                    if (imageUrl.startsWith("/")) {
                      imageUrl = `${API_URL}${imageUrl}`;
                    }
                  }

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
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
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Bestsellers Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h4" fontWeight={700}>
                Bestsellers
              </Typography>
            </Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                No products available
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {filteredProducts.slice(0, 8).map((product) => {
                  let imageUrl = "https://via.placeholder.com/400";
                  if (product.images && product.images.length > 0) {
                    imageUrl = product.images[0];
                    if (imageUrl.startsWith("/")) {
                      imageUrl = `${API_URL}${imageUrl}`;
                    }
                  }

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
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
          </Box>
        </TabPanel>

        {/* Category Sections (if no filters applied) */}
        {selectedCategory === "All" && !searchQuery && tabValue === 0 && categories.length > 0 && (
          <Box sx={{ mt: 8 }}>
            {categories.slice(0, 3).map((category) => {
              const categoryProducts = getCategoryProducts(category, 4);
              if (categoryProducts.length === 0) return null;

              return (
                <Box key={category} sx={{ mb: 8 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                    <Typography variant="h4" fontWeight={700}>
                      {category}
                    </Typography>
                    <Button
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 600, textTransform: "none" }}
                      onClick={() => setSelectedCategory(category)}
                    >
                      View All
                    </Button>
                  </Box>
                  <Grid container spacing={3}>
                    {categoryProducts.map((product) => {
                      let imageUrl = "https://via.placeholder.com/400";
                      if (product.images && product.images.length > 0) {
                        imageUrl = product.images[0];
                        if (imageUrl.startsWith("/")) {
                          imageUrl = `${API_URL}${imageUrl}`;
                        }
                      }

                      return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
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
                </Box>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}

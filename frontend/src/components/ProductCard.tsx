"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Stack,
  Typography,
  Tooltip,
  Snackbar,
  Alert
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { isAuthenticated } from "../utils/auth";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
  };
  hideAddToCart?: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function ProductCard({ product, hideAddToCart = false }: ProductCardProps) {
  const router = useRouter();
  // Check authentication immediately on render
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => {
    if (typeof window !== "undefined") {
      return isAuthenticated();
    }
    return false;
  });
  const [quantity, setQuantity] = React.useState(1);
  const [addingToCart, setAddingToCart] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success"
  });

  React.useEffect(() => {
    // Update on mount
    setIsLoggedIn(isAuthenticated());
    
    // Listen for storage changes (login/logout)
    const handleStorageChange = () => {
      setIsLoggedIn(isAuthenticated());
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const currentAuth = isAuthenticated();
      if (currentAuth !== isLoggedIn) {
        setIsLoggedIn(currentAuth);
      }
    }, 500);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn) {
      router.push("/login?redirect=/products");
      return;
    }

    setAddingToCart(true);

    try {
      let accessToken = localStorage.getItem("accessToken");
      const cartId = localStorage.getItem("cartId");

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      if (cartId) {
        headers["x-cart-id"] = cartId;
      }

      let response = await fetch(`${API_URL}/api/cart/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId: product.id,
          quantity: quantity
        })
      });

      // If token expired, try to refresh it
      if (response.status === 401 && accessToken) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          // Retry the request with new token
          response = await fetch(`${API_URL}/api/cart/items`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              productId: product.id,
              quantity: quantity
            })
          });
        } else {
          // Refresh failed, redirect to login
          setSnackbar({
            open: true,
            message: "Your session has expired. Please log in again.",
            severity: "error"
          });
          setTimeout(() => {
            router.push("/login?redirect=/products");
          }, 2000);
          setAddingToCart(false);
          return;
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add item to cart");
      }

      // Store cartId if returned
      if (data.cartId) {
        localStorage.setItem("cartId", data.cartId);
      }

      // Dispatch custom event to update cart count in header
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      setSnackbar({
        open: true,
        message: `${quantity} ${quantity === 1 ? "item" : "items"} of ${product.name} added to cart!`,
        severity: "success"
      });
      
      // Reset quantity after adding to cart
      setQuantity(1);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to add item to cart. Please try again.",
        severity: "error"
      });
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease-in-out",
        cursor: "pointer",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0px 20px 40px rgba(15, 23, 42, 0.12)"
        }
      }}
    >
      <Box sx={{ position: "relative", width: "100%" }}>
        <CardMedia
          component="img"
          height="240"
          image={product.image}
          alt={product.name}
          onError={(e) => {
            console.error("Failed to load product image:", product.image);
            console.error("Image element:", e.target);
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            console.error("Current src:", target.src);
            if (target.src !== "https://via.placeholder.com/400") {
              target.src = "https://via.placeholder.com/400";
            }
          }}
          onLoad={() => {
            console.log("Product image loaded successfully:", product.image);
          }}
          sx={{
            objectFit: "cover",
            backgroundColor: "grey.100",
            width: "100%"
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 1
          }}
        >
          <Chip
            label={product.category}
            size="small"
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              fontWeight: 600,
              fontSize: "0.75rem"
            }}
          />
        </Box>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            // Handle favorite action
          }}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "background.paper",
            "&:hover": { backgroundColor: "background.paper", color: "error.main" }
          }}
          size="small"
        >
          <FavoriteBorderIcon fontSize="small" />
        </IconButton>
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: "3.5em"
            }}
          >
            {product.name}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              ${product.price.toFixed(2)}
            </Typography>
            {isLoggedIn && !hideAddToCart && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/* Quantity Controls */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden"
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(-1);
                    }}
                    disabled={quantity <= 1}
                    sx={{
                      borderRadius: 0,
                      "&:hover": { backgroundColor: "action.hover" }
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="body1"
                    sx={{
                      minWidth: 40,
                      textAlign: "center",
                      fontWeight: 600,
                      px: 1
                    }}
                  >
                    {quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(1);
                    }}
                    sx={{
                      borderRadius: 0,
                      "&:hover": { backgroundColor: "action.hover" }
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Add to Cart Button */}
                <Tooltip title="Add to cart" arrow enterDelay={100} leaveDelay={0}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddShoppingCartIcon />}
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      flex: 1
                    }}
                  >
                    {addingToCart ? "Adding..." : "Add"}
                  </Button>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Stack>
      </CardContent>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}

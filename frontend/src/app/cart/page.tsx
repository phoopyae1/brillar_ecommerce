"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
  Tooltip
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Link from "next/link";
import { isAuthenticated, getUser } from "../../utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type CartItem = {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
  };
  variant?: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
  };
};

export default function CartPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = React.useState(true);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cartId, setCartId] = React.useState<string | null>(null);

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

  // Fetch cart function - can be called from multiple places
  const fetchCart = React.useCallback(async () => {
    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        router.push("/login?redirect=/cart");
        return;
      }

      // Get or create cart ID from localStorage
      let storedCartId = localStorage.getItem("cartId");
      
      let response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(storedCartId && { "x-cart-id": storedCartId })
        }
      });

      // If token expired, try to refresh it
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/cart`, {
            headers: {
              Authorization: `Bearer ${newToken}`,
              ...(storedCartId && { "x-cart-id": storedCartId })
            }
          });
        } else {
          router.push("/login?redirect=/cart");
          return;
        }
      }

      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }

      const data = await response.json();
      setCartItems(data.items || []);
      if (data.cartId) {
        setCartId(data.cartId);
        localStorage.setItem("cartId", data.cartId);
      }
    } catch (err: any) {
      console.error("Error fetching cart:", err);
      // Set empty cart on error
      setCartItems([]);
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  }, [router]);

  React.useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push("/login?redirect=/cart");
      return;
    }

    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - router changes shouldn't trigger refetch

  // Listen for cart update events (when items are added from other pages)
  React.useEffect(() => {
    const handleCartUpdate = () => {
      fetchCart();
    };
    
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [fetchCart]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(cartId && { "x-cart-id": cartId })
        }
      });

      if (response.ok) {
        // Remove item from local state
        setCartItems((prev) => prev.filter((item) => item.id !== itemId));
        // Dispatch custom event to update cart count in header
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated()) {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (cartItems.length === 0) {
      return;
    }
    router.push("/checkout");
  };

  if (isChecking || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => {
    if (!item.product) {
      console.warn("Cart item missing product data:", item);
      return sum;
    }
    const price = Number(item.product.price);
    return sum + price * item.quantity;
  }, 0);
  const shipping: number = 0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", pb: 8 }}>
      <Container sx={{ py: 6 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Shopping Cart
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in your cart
        </Typography>

        {cartItems.length === 0 ? (
          <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ textAlign: "center", py: 8 }}>
              <ShoppingCartIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
              <Typography variant="h5" fontWeight={500} gutterBottom>
                Your cart is empty
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Start adding items to your cart to see them here.
              </Typography>
              <Button variant="contained" component={Link} href="/products" size="large">
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={4}>
            {/* Cart Items */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                {cartItems
                  .filter((item) => item.product) // Filter out items without product data
                  .map((item) => {
                  if (!item.product) {
                    return null;
                  }
                  const price = Number(item.product.price);
                  const imageUrl = item.product.images && item.product.images.length > 0 
                    ? item.product.images[0] 
                    : "https://via.placeholder.com/200";
                  
                  return (
                    <Card key={item.id} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                      <CardContent>
                        <Stack direction="row" spacing={3}>
                          <Box
                            sx={{
                              width: 120,
                              height: 120,
                              borderRadius: 2,
                              overflow: "hidden",
                              backgroundColor: "grey.100",
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={item.product.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://via.placeholder.com/200";
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                  {item.product.name}
                                </Typography>
                                {item.variant && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {Object.entries(item.variant.attributes)
                                      .map(([key, value]) => `${key}: ${value}`)
                                      .join(" • ")}
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography sx={{ minWidth: 40, textAlign: "center" }}>
                                    Qty: {item.quantity}
                                  </Typography>
                                </Stack>
                              </Box>
                              <Box sx={{ textAlign: "right" }}>
                                <Tooltip 
                                  title="Remove from cart" 
                                  arrow
                                  enterDelay={100}
                                  leaveDelay={0}
                                >
                                  <IconButton
                                    color="error"
                                    sx={{ mb: 1 }}
                                    onClick={() => handleRemoveItem(item.id)}
                                  >
                                    <DeleteOutlineIcon />
                                  </IconButton>
                                </Tooltip>
                                <Typography variant="h6" fontWeight={700} color="primary.main">
                                  ${(price * item.quantity).toFixed(2)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  ${price.toFixed(2)} each
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: "sticky", top: 100, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Order Summary
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Subtotal</Typography>
                    <Typography fontWeight={600}>${subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Shipping</Typography>
                    <Typography fontWeight={600}>
                      {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Tax</Typography>
                    <Typography fontWeight={600}>${tax.toFixed(2)}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="h6" fontWeight={700}>
                      Total
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      ${total.toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>
                <Tooltip 
                  title={cartItems.length === 0 ? "Add items to cart first" : "Complete your purchase"} 
                  arrow
                  enterDelay={100}
                  leaveDelay={0}
                >
                  <span>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<ShoppingCartCheckoutIcon />}
                      onClick={handleCheckout}
                      disabled={cartItems.length === 0}
                      sx={{ mt: 3, py: 1.5, fontWeight: 600 }}
                    >
                      Proceed to Checkout
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip 
                  title="Browse more products" 
                  arrow
                  enterDelay={100}
                  leaveDelay={0}
                >
                  <Button
                    variant="outlined"
                    fullWidth
                    component={Link}
                    href="/products"
                    sx={{ mt: 2, py: 1.5 }}
                  >
                    Continue Shopping
                  </Button>
                </Tooltip>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        )}
      </Container>
    </Box>
  );
}

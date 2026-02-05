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
  Stack,
  TextField,
  Typography,
  CircularProgress
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LockIcon from "@mui/icons-material/Lock";
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

export default function CheckoutPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [user, setUser] = React.useState<{ name: string; email: string } | null>(null);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
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

  React.useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push("/login?redirect=/checkout");
      return;
    }
    
    // Get user info to pre-fill form
    const userData = getUser();
    if (userData) {
      setUser({ name: userData.name, email: userData.email });
    }

    // Fetch cart items
    const fetchCart = async () => {
      try {
        let accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
          router.push("/login?redirect=/checkout");
          return;
        }

        let storedCartId = localStorage.getItem("cartId");
        
        let response = await fetch(`${API_URL}/api/cart`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(storedCartId && { "x-cart-id": storedCartId })
          }
        });

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
            router.push("/login?redirect=/checkout");
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

        if (!data.items || data.items.length === 0) {
          router.push("/cart");
          return;
        }
      } catch (err: any) {
        console.error("Error fetching cart:", err);
        router.push("/cart");
      } finally {
        setIsChecking(false);
      }
    };

    fetchCart();
  }, [router]);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated()) {
      router.push("/login?redirect=/checkout");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty. Please add items to your cart first.");
      router.push("/cart");
      return;
    }

    setLoading(true);

    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        alert("Please log in to place an order.");
        router.push("/login?redirect=/checkout");
        return;
      }

      let response = await fetch(`${API_URL}/api/orders/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(cartId && { "x-cart-id": cartId })
        },
        body: JSON.stringify({
          paymentMethod: "SIMULATED"
        })
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/orders/checkout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`,
              ...(cartId && { "x-cart-id": cartId })
            },
            body: JSON.stringify({
              paymentMethod: "SIMULATED"
            })
          });
        } else {
          alert("Your session has expired. Please log in again.");
          router.push("/login?redirect=/checkout");
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to place order");
      }

      const order = await response.json();
      
      // Clear cart ID from localStorage
      localStorage.removeItem("cartId");
      
      // Redirect to orders page
      router.push("/account/orders");
    } catch (error: any) {
      console.error("Error placing order:", error);
      alert(error.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate order summary from cart items
  const subtotal = cartItems.reduce((sum, item) => {
    if (!item.product) return sum;
    const price = Number(item.product.price);
    return sum + price * item.quantity;
  }, 0);
  const shipping = 0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  if (isChecking) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", pb: 8 }}>
      <Container sx={{ py: 6 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Checkout
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Complete your order securely
        </Typography>

        <Grid container spacing={4}>
          {/* Checkout Form */}
          <Grid item xs={12} md={8}>
            <Stack spacing={4}>
              {/* Shipping Information */}
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <LocalShippingIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Shipping Information
                    </Typography>
                  </Stack>
                  <Stack spacing={2.5}>
                    <TextField 
                      label="Full Name" 
                      fullWidth 
                      required 
                      defaultValue={user?.name || ""}
                    />
                    <TextField 
                      label="Email Address" 
                      type="email" 
                      fullWidth 
                      required 
                      defaultValue={user?.email || ""}
                    />
                    <TextField label="Phone Number" type="tel" fullWidth />
                    <TextField label="Street Address" fullWidth required />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label="City" fullWidth required />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Postal Code" fullWidth required />
                      </Grid>
                    </Grid>
                    <TextField label="Country" fullWidth required defaultValue="United States" />
                  </Stack>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <CreditCardIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Payment Information
                    </Typography>
                  </Stack>
                  <Stack spacing={2.5}>
                    <TextField 
                      label="Card Number" 
                      fullWidth 
                      required 
                      defaultValue="1234 5678 9012 3456"
                      placeholder="1234 5678 9012 3456" 
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          label="Expiry Date" 
                          fullWidth 
                          required 
                          defaultValue="02/28"
                          placeholder="MM/YY" 
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          label="CVV" 
                          fullWidth 
                          required 
                          defaultValue="399"
                          placeholder="123" 
                        />
                      </Grid>
                    </Grid>
                    <TextField 
                      label="Cardholder Name" 
                      fullWidth 
                      required 
                      defaultValue="Jasmine"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: "sticky", top: 100, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
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
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<LockIcon />}
                  onClick={handlePlaceOrder}
                  disabled={loading || cartItems.length === 0}
                  sx={{ mt: 3, py: 1.5, fontWeight: 600 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Processing...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: "block", textAlign: "center" }}
                >
                  🔒 Payments are simulated in this demo
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

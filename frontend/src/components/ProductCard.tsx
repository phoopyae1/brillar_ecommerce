"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography
} from "@mui/material";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 4,
        border: "1px solid #E2E8F0",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 24px 50px rgba(15, 23, 42, 0.16)"
        }
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          height="200"
          image={product.image}
          alt={product.name}
        />
        <Chip
          label={product.category}
          size="small"
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            bgcolor: "common.white",
            fontWeight: 600,
            color: "#2563EB"
          }}
        />
      </Box>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Designed for comfort, crafted to last.
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700} sx={{ color: "#0F172A" }}>
              ${product.price.toFixed(2)}
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{
                bgcolor: "#F59E0B",
                color: "#111827",
                "&:hover": {
                  bgcolor: "#D97706"
                }
              }}
            >
              Add to cart
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

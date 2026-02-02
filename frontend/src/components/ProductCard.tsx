"use client";

import {
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
    <Card sx={{ height: "100%", backgroundColor: "background.paper" }}>
      <CardMedia
        component="img"
        height="180"
        image={product.image}
        alt={product.name}
      />
      <CardContent>
        <Stack spacing={1}>
          <Chip
            label={product.category}
            size="small"
            color="secondary"
            sx={{ width: "fit-content", color: "#F8FAFC" }}
          />
          <Typography variant="h6">{product.name}</Typography>
          <Typography variant="subtitle1" fontWeight={600} color="primary">
            ${product.price.toFixed(2)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

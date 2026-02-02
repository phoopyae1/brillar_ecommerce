"use client";

import Link from "next/link";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

export function Header() {
  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={700}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            Brillar
          </Link>
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button component={Link} href="/products" color="inherit">
            Products
          </Button>
          <Button component={Link} href="/cart" color="inherit">
            Cart
          </Button>
          <Button component={Link} href="/admin" variant="outlined">
            Admin
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

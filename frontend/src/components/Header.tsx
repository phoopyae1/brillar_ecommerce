"use client";

import Link from "next/link";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

export function Header() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider"
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={700} color="secondary.main">
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            Brillar
          </Link>
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button component={Link} href="/products" color="secondary">
            Products
          </Button>
          <Button component={Link} href="/cart" color="secondary">
            Cart
          </Button>
          <Button component={Link} href="/admin" variant="outlined" color="secondary">
            Admin
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

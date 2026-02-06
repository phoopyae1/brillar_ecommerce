"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Container,
  Grid,
  Stack,
  Typography,
  Divider,
  IconButton
} from "@mui/material";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import LocationOnIcon from "@mui/icons-material/LocationOn";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "About Brillar",
      links: [
        { label: "About Us", href: "#" },
        { label: "Contact us", href: "#" },
        { label: "News", href: "#" },
        { label: "Careers", href: "#" }
      ]
    },
    {
      title: "For Customers",
      links: [
        { label: "My Account", href: "/account" },
        { label: "Order History", href: "/account/orders" },
        { label: "Tracking", href: "#" },
        { label: "Returns", href: "#" },
        { label: "Shipping Information", href: "#" },
        { label: "Payment Methods", href: "#" }
      ]
    },
    {
      title: "Support & Information",
      links: [
        { label: "Help Center", href: "#" },
        { label: "Delivery Zones", href: "#" },
        { label: "Policies", href: "#" },
        { label: "Terms & Conditions", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Legal", href: "#" }
      ]
    },
    {
      title: "Shop",
      links: [
        { label: "All Products", href: "/products" },
        { label: "Categories", href: "/products" },
        { label: "Bestsellers", href: "/products" },
        { label: "New Arrivals", href: "/products" }
      ]
    }
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        mt: "auto",
        pt: 6,
        pb: 3
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand Section */}
          <Grid item xs={12} md={4}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{
                mb: 2,
                background: "linear-gradient(135deg, #2563EB 0%, #1E293B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Brillar Ecommerce
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
              Premium e-commerce experience with curated products, real-time inventory, and seamless checkout.
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", backgroundColor: "primary.50" }
                }}
                aria-label="Facebook"
              >
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", backgroundColor: "primary.50" }
                }}
                aria-label="Twitter"
              >
                <TwitterIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", backgroundColor: "primary.50" }
                }}
                aria-label="Instagram"
              >
                <InstagramIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "primary.main", backgroundColor: "primary.50" }
                }}
                aria-label="LinkedIn"
              >
                <LinkedInIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>

          {/* Footer Links Sections */}
          {footerSections.map((section, index) => (
            <Grid item xs={6} md={2} key={index}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                {section.title}
              </Typography>
              <Stack spacing={1}>
                {section.links.map((link, linkIndex) => (
                  <Link
                    key={linkIndex}
                    href={link.href}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        "&:hover": {
                          color: "primary.main",
                          cursor: "pointer"
                        },
                        transition: "color 0.2s"
                      }}
                    >
                      {link.label}
                    </Typography>
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        {/* Contact Information */}
        <Box sx={{ mt: 4, mb: 3 }}>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  support@brillarecommerce.com
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalPhoneIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  +65 6123 4567
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOnIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  123 Orchard Road, #12-34, Singapore 238891
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Newsletter Section */}
        <Box
          sx={{
            mt: 4,
            mb: 3,
            p: 3,
            borderRadius: 2,
            backgroundColor: "primary.50",
            textAlign: "center"
          }}
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            🔥 Join our newsletter, get special discounts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Subscribe to receive updates on new products, special offers, and exclusive deals.
          </Typography>
          <Box
            component="form"
            sx={{
              display: "flex",
              gap: 1,
              maxWidth: 400,
              mx: "auto",
              flexDirection: { xs: "column", sm: "row" }
            }}
          >
            <Box
              component="input"
              type="email"
              placeholder="Enter your email"
              sx={{
                flex: 1,
                px: 2,
                py: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                fontSize: "0.875rem",
                "&:focus": {
                  outline: "none",
                  borderColor: "primary.main"
                }
              }}
            />
            <Box
              component="button"
              type="submit"
              sx={{
                px: 3,
                py: 1.5,
                backgroundColor: "primary.main",
                color: "white",
                border: "none",
                borderRadius: 2,
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "primary.dark"
                }
              }}
            >
              Subscribe
            </Box>
          </Box>
        </Box>

        {/* Copyright */}
        <Divider sx={{ mt: 4, mb: 2 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} Brillar Ecommerce. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Link href="#" style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  "&:hover": { color: "primary.main" },
                  transition: "color 0.2s"
                }}
              >
                Privacy Policy
              </Typography>
            </Link>
            <Link href="#" style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  "&:hover": { color: "primary.main" },
                  transition: "color 0.2s"
                }}
              >
                Terms of Service
              </Typography>
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

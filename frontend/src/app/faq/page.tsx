"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Chip,
  Stack
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { FAQ, FaqListResponse } from "@brillar/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function FAQPage() {
  const [faqs, setFaqs] = React.useState<FAQ[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/faq`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load FAQs");
        }
        const data = (await response.json()) as FaqListResponse;
        setFaqs(data.faqs ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load FAQs");
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const byCategory = React.useMemo(() => {
    const map = new Map<string | null, FAQ[]>();
    for (const faq of faqs) {
      const key = faq.category?.trim() || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(faq);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [faqs]);

  const categories = React.useMemo(() => {
    const keys = Array.from(byCategory.keys());
    return keys.sort((a, b) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return a.localeCompare(b);
    });
  }, [byCategory]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <HelpOutlineIcon sx={{ fontSize: 36, color: "primary.main" }} />
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              background: "linear-gradient(135deg, #2563EB 0%, #1E293B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Frequently Asked Questions
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Find answers to common questions about orders, shipping, returns, and more.
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {faqs.length === 0 && !error && (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            No FAQs available at the moment. Please check back later.
          </Typography>
        )}

        {faqs.length > 0 &&
          categories.map((cat) => {
            const items = byCategory.get(cat)!;
            return (
              <Box key={cat ?? "general"} sx={{ mb: 3 }}>
                {cat && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={cat} size="small" color="primary" variant="outlined" />
                  </Stack>
                )}
                {items.map((faq) => (
                  <Accordion
                    key={faq.id}
                    sx={{
                      mb: 1,
                      "&:before": { display: "none" },
                      boxShadow: 1,
                      borderRadius: "8px !important",
                      overflow: "hidden"
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        fontWeight: 600,
                        "& .MuiAccordionSummary-content": { my: 1.5 }
                      }}
                    >
                      {faq.question}
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            );
          })}
      </Container>
    </Box>
  );
}

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
  Alert,
  Chip,
  Stack
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function FAQPage() {
  const [faqs, setFaqs] = React.useState<FAQ[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | false>(false);

  React.useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/faq`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || "Failed to fetch FAQs";
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setFaqs(data.faqs || []);
      } catch (err: any) {
        console.error("Error fetching FAQs:", err);
        setError(err.message || "Failed to load FAQs");
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Group FAQs by category
  const groupedFAQs = React.useMemo(() => {
    const grouped: Record<string, FAQ[]> = {};
    const uncategorized: FAQ[] = [];

    faqs.forEach((faq) => {
      if (faq.category) {
        if (!grouped[faq.category]) {
          grouped[faq.category] = [];
        }
        grouped[faq.category].push(faq);
      } else {
        uncategorized.push(faq);
      }
    });

    // Sort FAQs within each category by order
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => a.order - b.order);
    });
    uncategorized.sort((a, b) => a.order - b.order);

    return { grouped, uncategorized };
  }, [faqs]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <HelpOutlineIcon sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          Frequently Asked Questions
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
          Find answers to common questions about our products, shipping, returns, and more.
        </Typography>
      </Box>

      {/* FAQs by Category */}
      {Object.keys(groupedFAQs.grouped).length > 0 && (
        <Box sx={{ mb: 6 }}>
          {Object.entries(groupedFAQs.grouped).map(([category, categoryFAQs]) => (
            <Box key={category} sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                <Chip label={category} color="primary" size="small" />
              </Typography>
              {categoryFAQs.map((faq) => (
                <Accordion
                  key={faq.id}
                  expanded={expanded === faq.id}
                  onChange={handleChange(faq.id)}
                  sx={{
                    mb: 2,
                    boxShadow: 2,
                    "&:before": { display: "none" },
                    borderRadius: 2,
                    overflow: "hidden"
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      backgroundColor: "background.paper",
                      "&:hover": { backgroundColor: "action.hover" },
                      px: 3,
                      py: 2
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ flexShrink: 0, pr: 2 }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 3, py: 3, backgroundColor: "grey.50" }}>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
                    >
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ))}
        </Box>
      )}

      {/* Uncategorized FAQs */}
      {groupedFAQs.uncategorized.length > 0 && (
        <Box>
          {Object.keys(groupedFAQs.grouped).length > 0 && (
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
              General Questions
            </Typography>
          )}
          {groupedFAQs.uncategorized.map((faq) => (
            <Accordion
              key={faq.id}
              expanded={expanded === faq.id}
              onChange={handleChange(faq.id)}
              sx={{
                mb: 2,
                boxShadow: 2,
                "&:before": { display: "none" },
                borderRadius: 2,
                overflow: "hidden"
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: "background.paper",
                  "&:hover": { backgroundColor: "action.hover" },
                  px: 3,
                  py: 2
                }}
              >
                <Typography variant="h6" fontWeight={600} sx={{ flexShrink: 0, pr: 2 }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, py: 3, backgroundColor: "grey.50" }}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Empty State */}
      {faqs.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <HelpOutlineIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No FAQs available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check back later for frequently asked questions.
          </Typography>
        </Box>
      )}

      {/* Contact Support Section */}
      <Box
        sx={{
          mt: 8,
          p: 4,
          borderRadius: 2,
          backgroundColor: "primary.50",
          textAlign: "center"
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Still have questions?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Can't find the answer you're looking for? Please reach out to our friendly support team.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            📧 support@brillarecommerce.com
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📞 +65 6123 4567
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}

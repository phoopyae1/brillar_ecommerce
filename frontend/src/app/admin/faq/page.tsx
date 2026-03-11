"use client";

import React from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Snackbar,
  Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import type { FAQ } from "@brillar/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminFAQPage() {
  const [faqs, setFaqs] = React.useState<FAQ[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [addFAQOpen, setAddFAQOpen] = React.useState(false);
  const [editFAQOpen, setEditFAQOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedFAQ, setSelectedFAQ] = React.useState<FAQ | null>(null);
  const [formData, setFormData] = React.useState({
    question: "",
    answer: "",
    category: "",
    order: "0",
    isActive: true
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success"
  });

  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  };

  const showToast = (message: string, severity: "success" | "error" | "warning" | "info" = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchFAQs = React.useCallback(async () => {
    try {
      setLoading(true);
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setLoading(false);
        return;
      }

      let response = await fetch(`${API_URL}/api/faq`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/faq`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        } else {
          setLoading(false);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setFaqs(data.faqs || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        // If unauthorized, try fetching without auth (public endpoint)
        if (response.status === 401 || response.status === 403) {
          const publicResponse = await fetch(`${API_URL}/api/faq`);
          if (publicResponse.ok) {
            const publicData = await publicResponse.json();
            setFaqs(publicData.faqs || []);
          } else {
            const publicErrorData = await publicResponse.json().catch(() => ({}));
            showToast(publicErrorData.message || errorData.message || "Failed to load FAQs", "error");
          }
        } else {
          showToast(errorData.message || errorData.error || "Failed to load FAQs", "error");
        }
      }
    } catch (error: any) {
      console.error("Error fetching FAQs:", error);
      showToast(error.message || "Failed to load FAQs", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const handleAddClick = () => {
    setFormData({
      question: "",
      answer: "",
      category: "",
      order: "0",
      isActive: true
    });
    setError("");
    setIsEditing(false);
    setSelectedFAQ(null);
    setAddFAQOpen(true);
  };

  const handleEditClick = (faq: FAQ) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "",
      order: faq.order.toString(),
      isActive: faq.isActive
    });
    setError("");
    setIsEditing(true);
    setSelectedFAQ(faq);
    setEditFAQOpen(true);
  };

  const handleDelete = async (faq: FAQ) => {
    if (!window.confirm(`Are you sure you want to delete this FAQ?\n\nQuestion: ${faq.question}`)) {
      return;
    }

    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        showToast("Please log in to delete FAQs", "warning");
        return;
      }

      let response = await fetch(`${API_URL}/api/faq/${faq.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/faq/${faq.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        } else {
          showToast("Session expired. Please log in again", "error");
          return;
        }
      }

      if (response.ok) {
        showToast("FAQ deleted successfully", "success");
        fetchFAQs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(errorData.message || "Failed to delete FAQ", "error");
      }
    } catch (error: any) {
      console.error("Error deleting FAQ:", error);
      showToast("Failed to delete FAQ", "error");
    }
  };

  const handleSubmit = async () => {
    setError("");

    if (!formData.question.trim()) {
      setError("Question is required");
      return;
    }

    if (!formData.answer.trim()) {
      setError("Answer is required");
      return;
    }

    setSubmitting(true);

    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        showToast("Please log in to manage FAQs", "warning");
        setSubmitting(false);
        return;
      }

      const payload = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        category: formData.category.trim() || null,
        order: parseInt(formData.order) || 0,
        ...(isEditing && { isActive: formData.isActive })
      };

      let url = `${API_URL}/api/faq`;
      let method = "POST";

      if (isEditing && selectedFAQ) {
        url = `${API_URL}/api/faq/${selectedFAQ.id}`;
        method = "PUT";
      }

      let response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`
            },
            body: JSON.stringify(payload)
          });
        } else {
          showToast("Session expired. Please log in again", "error");
          setSubmitting(false);
          return;
        }
      }

      if (response.ok) {
        showToast(isEditing ? "FAQ updated successfully" : "FAQ created successfully", "success");
        setAddFAQOpen(false);
        setEditFAQOpen(false);
        setFormData({
          question: "",
          answer: "",
          category: "",
          order: "0",
          isActive: true
        });
        setIsEditing(false);
        setSelectedFAQ(null);
        fetchFAQs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || "Failed to save FAQ");
      }
    } catch (error: any) {
      console.error("Error saving FAQ:", error);
      setError(error.message || "Failed to save FAQ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAddFAQOpen(false);
    setEditFAQOpen(false);
    setFormData({
      question: "",
      answer: "",
      category: "",
      order: "0",
      isActive: true
    });
    setError("");
    setIsEditing(false);
    setSelectedFAQ(null);
  };

  const filteredFAQs = faqs.filter((faq) => {
    const query = searchQuery.toLowerCase();
    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      (faq.category && faq.category.toLowerCase().includes(query))
    );
  });

  // Get unique categories
  const categories = Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)));

  return (
    <AdminLayout>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              FAQ Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage frequently asked questions for your customers
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 3
            }}
          >
            Add FAQ
          </Button>
        </Stack>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search FAQs by question, answer, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 3 }}
            />

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredFAQs.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <HelpOutlineIcon sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchQuery ? "No FAQs found" : "No FAQs yet"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Get started by adding your first FAQ"}
                </Typography>
                {!searchQuery && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
                    Add FAQ
                  </Button>
                )}
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Question</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Order</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFAQs
                    .sort((a, b) => {
                      // Sort by order first, then by creation date
                      if (a.order !== b.order) {
                        return a.order - b.order;
                      }
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .map((faq) => (
                      <TableRow key={faq.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {faq.question}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            {faq.answer.substring(0, 100)}
                            {faq.answer.length > 100 ? "..." : ""}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {faq.category ? (
                            <Chip label={faq.category} size="small" color="primary" variant="outlined" />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{faq.order}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={faq.isActive ? "Active" : "Inactive"}
                            size="small"
                            color={faq.isActive ? "success" : "default"}
                            variant={faq.isActive ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Edit FAQ">
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(faq)}
                                sx={{ color: "primary.main" }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete FAQ">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(faq)}
                                sx={{ color: "error.main" }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit FAQ Dialog */}
        <Dialog
          open={addFAQOpen || editFAQOpen}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                {isEditing ? "Edit FAQ" : "Add New FAQ"}
              </Typography>
              <IconButton onClick={handleClose} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {error && (
                <Alert severity="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}

              <TextField
                label="Question"
                fullWidth
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter the question..."
                multiline
                rows={2}
              />

              <TextField
                label="Answer"
                fullWidth
                required
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the answer..."
                multiline
                rows={6}
              />

              <TextField
                label="Category (Optional)"
                fullWidth
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Shipping, Returns, Products..."
                helperText="Group related FAQs together"
              />

              <TextField
                label="Display Order"
                fullWidth
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                helperText="Lower numbers appear first. Default: 0"
                inputProps={{ min: 0 }}
              />

              {isEditing && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} /> : null}
            >
              {submitting ? "Saving..." : isEditing ? "Update FAQ" : "Create FAQ"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
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
      </Box>
    </AdminLayout>
  );
}

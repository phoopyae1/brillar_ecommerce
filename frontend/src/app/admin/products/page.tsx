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
  Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Product = {
  id: string;
  name: string;
  status: string;
  price: number;
  cost?: number | null;
  category: string;
  stock?: number;
};

// Component for displaying product image with error handling
const ProductImageItem = ({ url, index, onRemove }: { url: string; index: number; onRemove: () => void }) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  React.useEffect(() => {
    // Reset error state when URL changes
    setImageError(false);
    setImageLoading(true);
  }, [url]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper"
      }}
    >
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.100",
          overflow: "hidden",
          flexShrink: 0,
          position: "relative"
        }}
      >
        {imageLoading && !imageError && (
          <CircularProgress size={20} sx={{ position: "absolute" }} />
        )}
        {!imageError ? (
          <Box
            component="img"
            src={url}
            alt={`Product image ${index + 1}`}
            onError={(e) => {
              console.error("Failed to load image:", url, e);
              setImageError(true);
              setImageLoading(false);
            }}
            onLoad={() => {
              console.log("Image loaded successfully:", url);
              setImageLoading(false);
            }}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: imageLoading ? "none" : "block"
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              flexDirection: "column",
              gap: 0.5
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: 24, opacity: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: 10, opacity: 0.7 }}>
              Error
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {url}
        </Typography>
      </Box>
      <Tooltip title="Remove image" arrow enterDelay={100} leaveDelay={0}>
        <IconButton
          size="small"
          onClick={onRemove}
          color="error"
        >
          <RemoveCircleOutlineIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [addProductOpen, setAddProductOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [toast, setToast] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info"
  });

  const showToast = (message: string, severity: "success" | "error" | "warning" | "info" = "info") => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    cost: "",
    category: "",
    status: "ACTIVE",
    images: [] as string[],
    currency: "USD",
    stock: "0"
  });
  const [imageUrl, setImageUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedId(null);
  };

  const handleEdit = async (e?: React.MouseEvent) => {
    // Prevent menu from closing immediately
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const productIdToEdit = selectedId;
    if (!productIdToEdit) {
      console.error("No product selected for editing");
      handleMenuClose();
      return;
    }

    console.log("Editing product with ID:", productIdToEdit);
    
    // Close menu immediately but keep the ID
    setAnchorEl(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        showToast("Please log in to edit products.", "warning");
        setSelectedId(null);
        return;
      }

      // Fetch product details (GET endpoint is public, doesn't require auth)
      console.log("Fetching product from:", `${API_URL}/api/products/${productIdToEdit}`);
      const response = await fetch(`${API_URL}/api/products/${productIdToEdit}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch product: ${response.status} ${response.statusText}`);
      }

      const product = await response.json();
      console.log("Product fetched successfully:", product);

      // Fetch inventory to get stock
      let stock = 0;
      try {
        const currentToken = accessToken || await refreshAccessToken();
        if (currentToken) {
          let inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          });

          // Handle 401 for inventory
          if (inventoryResponse.status === 401) {
            const newToken = await refreshAccessToken();
            if (newToken) {
              inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
                headers: {
                  Authorization: `Bearer ${newToken}`
                }
              });
            }
          }

          if (inventoryResponse.ok) {
            const inventoryData = await inventoryResponse.json();
            const productInventory = inventoryData.find(
              (inv: any) => inv.productId === product.id && !inv.variantId
            );
            if (productInventory) {
              stock = productInventory.quantityOnHand || 0;
            }
          }
        }
      } catch (invError) {
        console.warn("Failed to fetch inventory for stock:", invError);
        // Continue without stock - user can still edit the product
      }

      // Convert relative image URLs to absolute URLs for display in form
      const displayImages = (product.images || []).map((img: string) => {
        // If relative URL, convert to absolute for display
        if (img.startsWith("/")) {
          return `${API_URL}${img}`;
        }
        // If already absolute or external URL, keep as is
        return img;
      });

      // Populate form with product data
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        description: product.description || "",
        price: product.price?.toString() || "",
        cost: product.cost?.toString() || "",
        category: product.category || "",
        status: product.status || "ACTIVE",
        images: displayImages,
        currency: product.currency || "USD",
        stock: stock.toString()
      });

      setIsEditing(true);
      setAddProductOpen(true);
      console.log("Edit dialog opened successfully");
      } catch (error: any) {
        console.error("Error fetching product:", error);
        const errorMessage = error.message || "Failed to load product for editing";
        showToast(`${errorMessage}. Please check the console for details.`, "error");
        setSelectedId(null);
      }
  };

  const handleDelete = async () => {
    const productIdToDelete = selectedId;
    if (!productIdToDelete) {
      handleMenuClose();
      return;
    }

    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      handleMenuClose();
      return;
    }

    handleMenuClose();

    try {
      let accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        showToast("Please log in to delete products.", "warning");
        return;
      }

      let response = await fetch(`${API_URL}/api/products/${productIdToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // If token expired, try to refresh it
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/products/${productIdToDelete}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        } else {
          showToast("Your session has expired. Please log in again.", "error");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete product");
      }

      // Success - refresh the product list
      showToast("Product deleted successfully!", "success");
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error("Error deleting product:", error);
      showToast(`Failed to delete product: ${error.message || "Unknown error"}`, "error");
    }
  };

  const handleAddProductClick = () => {
    setIsEditing(false);
    setAddProductOpen(true);
  };

  const handleAddProductClose = () => {
    setAddProductOpen(false);
    setIsEditing(false);
    setFormData({
      name: "",
      slug: "",
      description: "",
      price: "",
      cost: "",
      category: "",
      status: "ACTIVE",
      images: [],
      currency: "USD",
      stock: "0"
    });
    setImageUrl("");
    setError("");
    setSelectedId(null);
    setAnchorEl(null); // Ensure menu is closed
  };

  const handleAddImage = () => {
    const trimmedUrl = imageUrl.trim();
    if (trimmedUrl && (trimmedUrl.startsWith("http") || trimmedUrl.startsWith("/"))) {
      // If relative URL, convert to absolute
      const finalUrl = trimmedUrl.startsWith("/") ? `${API_URL}${trimmedUrl}` : trimmedUrl;
      console.log("Adding image URL:", finalUrl);
      setFormData((prev) => {
        const newImages = [...prev.images, finalUrl];
        console.log("Updated images array:", newImages);
        return {
          ...prev,
          images: newImages
        };
      });
      setImageUrl("");
    } else {
      showToast("Please enter a valid image URL starting with http:// or https://", "warning");
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }

    console.log("Files selected:", files.length);
    setUploading(true);
    let accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      showToast("Please log in to upload images.", "warning");
      setUploading(false);
      event.target.value = "";
      return;
    }

    try {
      const formData = new FormData();
      Array.from(files).forEach((file, index) => {
        console.log(`Adding file ${index + 1}:`, file.name, file.type, file.size);
        formData.append("images", file);
      });

      console.log("Sending upload request to:", `${API_URL}/api/upload/images`);
      
      // Don't set Content-Type header - browser will set it automatically with boundary
      let response = await fetch(`${API_URL}/api/upload/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
          // Note: Don't set Content-Type - browser sets it automatically for FormData
        },
        body: formData
      });

      console.log("Upload response status:", response.status);

      // If token expired, try to refresh it
      if (response.status === 401) {
        console.log("Token expired, refreshing...");
        const newToken = await refreshAccessToken();
        if (newToken) {
          console.log("Token refreshed, retrying upload...");
          // Retry the request with new token
          response = await fetch(`${API_URL}/api/upload/images`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${newToken}`
            },
            body: formData
          });
          console.log("Retry response status:", response.status);
        } else {
          // Refresh failed, redirect to login
          showToast("Your session has expired. Please log in again.", "error");
          window.location.href = "/login";
          return;
        }
      }

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error("Upload error response:", errorData);
        } catch (e) {
          const text = await response.text();
          console.error("Upload error text:", text);
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Upload response data:", data);

      if (!data.files || data.files.length === 0) {
        throw new Error("No files were uploaded");
      }

      const uploadedUrls = data.files.map((file: any) => {
        // Convert relative URL to absolute URL
        let imageUrl = file.url;
        if (imageUrl.startsWith("/")) {
          imageUrl = `${API_URL}${imageUrl}`;
        }
        console.log("Uploaded image URL:", imageUrl);
        return imageUrl;
      });

      console.log("Adding images to form:", uploadedUrls);
      setFormData((prev) => {
        const newImages = [...prev.images, ...uploadedUrls];
        console.log("Updated images array:", newImages);
        return {
          ...prev,
          images: newImages
        };
      });
      
      // Show success message
      if (uploadedUrls.length === 1) {
        showToast(`Successfully uploaded ${uploadedUrls.length} image!`, "success");
      } else {
        showToast(`Successfully uploaded ${uploadedUrls.length} images!`, "success");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.message || "Failed to upload images. Please try again.";
      showToast(`Upload failed: ${errorMessage}`, "error");
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleAddProductSubmit = async () => {
    setError("");
    
    // Validate required fields
    if (!formData.name || !formData.slug || !formData.description || !formData.price || !formData.category) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate description length
    if (formData.description.length < 10) {
      setError("Description must be at least 10 characters long");
      return;
    }

    setSubmitting(true);
    let accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setError("Please log in to add products.");
      setSubmitting(false);
      return;
    }

    try {
      // Convert absolute image URLs back to relative URLs for storage
      // This ensures images work regardless of API_URL changes
      const normalizedImages = formData.images.map((img: string) => {
        // If it's an absolute URL with our API_URL, convert to relative
        if (img.startsWith(API_URL)) {
          return img.replace(API_URL, '');
        }
        // If it's already relative or external URL, keep as is
        return img;
      });

      // Prepare product data according to schema
      const productData: any = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        currency: formData.currency || "USD",
        images: normalizedImages,
        category: formData.category.trim(),
        tags: [], // Can be added later if needed
        status: formData.status
      };

      // Add cost if provided
      if (formData.cost && formData.cost.trim() !== "") {
        const costValue = parseFloat(formData.cost);
        if (!isNaN(costValue) && costValue > 0) {
          productData.cost = costValue;
        }
      }

      const stockQuantity = parseInt(formData.stock) || 0;
      const url = isEditing && selectedId 
        ? `${API_URL}/api/products/${selectedId}`
        : `${API_URL}/api/products`;
      const method = isEditing ? "PUT" : "POST";

      // For POST, include stock in the body
      const requestBody = isEditing 
        ? productData 
        : { ...productData, stock: stockQuantity };

      let response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      // Track the token we're using - it might be refreshed
      let currentAccessToken = accessToken;

      // If token expired, try to refresh it
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          currentAccessToken = newToken;
          // Retry the request with new token
          response = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`
            },
            body: JSON.stringify(requestBody)
          });
        } else {
          // Refresh failed, redirect to login
          setError("Your session has expired. Please log in again.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          setSubmitting(false);
          return;
        }
      }

      if (!response.ok) {
        let errorMessage = "Failed to create product";
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const newProductId = data.id;

      // If editing, update inventory (create if doesn't exist)
      // If creating new product, verify/update inventory was created correctly
      let inventoryUpdateSuccess = true;
      const currentStock = parseInt(formData.stock) || 0;
      
      if (currentStock > 0) {
        const productIdToUpdate = isEditing ? selectedId : newProductId;
        
        if (productIdToUpdate) {
          // Always try to update inventory - backend will create if it doesn't exist
          try {
            // Use the token from the product request (might have been refreshed)
            let currentToken = currentAccessToken || accessToken || await refreshAccessToken();
            if (!currentToken) {
              currentToken = await refreshAccessToken();
            }
            
            if (!currentToken) {
              throw new Error("Unable to get valid access token");
            }
            
            console.log(`${isEditing ? 'Updating' : 'Verifying'} inventory for product:`, productIdToUpdate, "with stock:", currentStock);
            
            let adjustResponse = await fetch(`${API_URL}/api/inventory/adjust`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`
              },
              body: JSON.stringify({
                productId: productIdToUpdate,
                quantity: currentStock,
                reason: isEditing ? "Stock update from product edit" : "Initial stock from product creation"
              })
            });

            // Handle 401 - token expired, try to refresh and retry
            if (adjustResponse.status === 401) {
              const newToken = await refreshAccessToken();
              if (newToken) {
                adjustResponse = await fetch(`${API_URL}/api/inventory/adjust`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${newToken}`
                  },
                  body: JSON.stringify({
                    productId: productIdToUpdate,
                    quantity: currentStock,
                    reason: isEditing ? "Stock update from product edit" : "Initial stock from product creation"
                  })
                });
              } else {
                throw new Error("Session expired. Please log in again.");
              }
            }

            if (!adjustResponse.ok) {
              const errorData = await adjustResponse.json().catch(() => ({}));
              console.error("Failed to update inventory stock:", errorData.message || adjustResponse.statusText);
              inventoryUpdateSuccess = false;
              showToast(`Product ${isEditing ? 'updated' : 'added'}, but failed to set stock: ${errorData.message || adjustResponse.statusText}`, "warning");
            } else {
              const inventoryData = await adjustResponse.json();
              console.log("Inventory updated successfully:", inventoryData);
              inventoryUpdateSuccess = true;
            }
          } catch (invError: any) {
            console.error("Error updating inventory:", invError);
            inventoryUpdateSuccess = false;
            const errorMessage = invError.message || 'Unknown error';
            if (errorMessage.includes("Session expired") || errorMessage.includes("token")) {
              showToast("Your session has expired. Please log in again.", "error");
              setTimeout(() => {
                window.location.href = "/login";
              }, 2000);
            } else {
              showToast(`Product ${isEditing ? 'updated' : 'added'}, but failed to set stock: ${errorMessage}`, "warning");
            }
            // Don't fail the product creation/update if inventory update fails
          }
        }
      }

      // Success - close dialog
      handleAddProductClose();
      
      // Wait a moment for database to commit, then refresh
      // Wait longer for new products to ensure inventory is fully committed
      const waitTime = isEditing ? (inventoryUpdateSuccess ? 500 : 200) : 800;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Trigger refresh by updating the refresh key
      setRefreshKey(prev => prev + 1);
      
      showToast(`Product ${isEditing ? 'updated' : 'added'} successfully!`, "success");
    } catch (err: any) {
      console.error("Error creating product:", err);
      setError(err.message || "Failed to create product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      let accessToken = localStorage.getItem("accessToken");
      
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("q", searchQuery);
      }

      let response = await fetch(`${API_URL}/api/products?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // If token expired, try to refresh it
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/api/products?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        } else {
          setLoading(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      
      // Fetch inventory to get stock levels
      let inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // If inventory fetch fails due to auth, try refresh
      if (inventoryResponse.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
        }
      }

      let inventoryData: any[] = [];
      if (inventoryResponse.ok) {
        inventoryData = await inventoryResponse.json();
        console.log("Fetched inventory data:", inventoryData.length, "records");
        // Log a few sample records for debugging
        if (inventoryData.length > 0) {
          console.log("Sample inventory records:", inventoryData.slice(0, 3));
        }
      } else {
        console.warn("Failed to fetch inventory data:", inventoryResponse.status);
      }

      // Map products with stock information
      const productsWithStock = (data.items || []).map((product: any) => {
        // Find inventory for this product (product-level inventory, not variants)
        // Check for both null and undefined variantId
        const productInventory = inventoryData.find(
          (inv: any) => inv.productId === product.id && (inv.variantId === null || inv.variantId === undefined)
        );

        // If no product-level inventory, check variants
        let stock = 0;
        if (productInventory) {
          stock = Number(productInventory.quantityOnHand) || 0;
        } else {
          // Sum up variant inventories if product has variants
          const variantInventories = inventoryData.filter(
            (inv: any) => product.variants?.some((v: any) => v.id === inv.variantId)
          );
          if (variantInventories.length > 0) {
            stock = variantInventories.reduce(
              (sum: number, inv: any) => sum + (Number(inv.quantityOnHand) || 0),
              0
            );
          }
        }

        return {
          id: product.id,
          name: product.name,
          status: product.status,
          price: Number(product.price),
          cost: product.cost ? Number(product.cost) : null,
          category: product.category,
          stock
        };
      });

      setProducts(productsWithStock);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshKey]);

  return (
    <AdminLayout>
      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Products
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your product catalog
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddProductClick}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600, textTransform: "none" }}
          >
            Add Product
          </Button>
        </Stack>

        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                placeholder="Search products..."
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  )
                }}
                sx={{ maxWidth: 400 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : products.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  No products found. {searchQuery ? "Try a different search term." : "Add your first product to get started."}
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Cost</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Profit</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Margin</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Stock</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 100 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => {
                    const cost = product.cost || 0;
                    const profit = product.price - cost;
                    const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
                    
                    return (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{product.name}</Typography>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>
                          <Chip
                            label={product.status}
                            color={product.status === "ACTIVE" ? "success" : "default"}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>${product.price.toFixed(2)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {cost > 0 ? (
                            <Typography color="text.secondary">${cost.toFixed(2)}</Typography>
                          ) : (
                            <Typography color="text.disabled" variant="body2">-</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {cost > 0 ? (
                            <Typography
                              fontWeight={600}
                              color={profit > 0 ? "success.main" : profit < 0 ? "error.main" : "text.secondary"}
                            >
                              ${profit.toFixed(2)}
                            </Typography>
                          ) : (
                            <Typography 
                              fontWeight={600}
                              color="text.secondary"
                            >
                              ${profit.toFixed(2)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {cost > 0 ? (
                            <Typography
                              fontWeight={600}
                              color={margin > 0 ? "success.main" : margin < 0 ? "error.main" : "text.secondary"}
                            >
                              {margin.toFixed(1)}%
                            </Typography>
                          ) : (
                            <Typography 
                              fontWeight={600}
                              color="text.secondary"
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={(product.stock || 0) < 20 ? "warning.main" : "text.primary"}
                            fontWeight={600}
                          >
                            {product.stock ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, product.id)}
                            sx={{ color: "text.secondary" }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem 
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
          >
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            Edit
          </MenuItem>
          <MenuItem 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }} 
            sx={{ color: "error.main" }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Add Product Dialog */}
        <Dialog open={addProductOpen} onClose={handleAddProductClose} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" fontWeight={700}>
                {isEditing ? "Edit Product" : "Add New Product"}
              </Typography>
              <Tooltip title="Close dialog" arrow enterDelay={100} leaveDelay={0}>
                <IconButton onClick={handleAddProductClose} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Product Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
              <TextField
                label="Slug"
                fullWidth
                required
                value={formData.slug}
                onChange={(e) => handleInputChange("slug", e.target.value)}
                helperText="URL-friendly identifier (e.g., aurora-sneakers)"
              />
              <TextField
                label="Description"
                fullWidth
                required
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Selling Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  helperText="Price customers will pay"
                />
                <TextField
                  label="Purchase Cost"
                  type="number"
                  fullWidth
                  value={formData.cost}
                  onChange={(e) => handleInputChange("cost", e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  helperText="Cost to purchase/manufacture"
                />
              </Box>
              {formData.price && formData.cost && parseFloat(formData.price) > 0 && parseFloat(formData.cost) > 0 && (
                <Box sx={{ p: 2, bgcolor: "success.50", borderRadius: 2, border: "1px solid", borderColor: "success.200" }}>
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">Profit per unit</Typography>
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        ${(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Profit margin</Typography>
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        {(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
              <TextField
                label="Category"
                fullWidth
                required
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Initial Stock Quantity"
                  type="number"
                  fullWidth
                  value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Initial quantity available in inventory"
                />
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  SelectProps={{
                    native: true
                  }}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                </TextField>
              </Box>
              
              {/* Photo Upload Section */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
                  Product Photos
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
                  {/* File Upload */}
                  <Box>
                    <input
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: "none" }}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ textTransform: "none", width: "100%" }}
                    >
                      {uploading ? "Uploading..." : "Upload Images from Computer"}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                      Select one or more images (JPEG, PNG, WEBP, GIF - Max 5MB each)
                    </Typography>
                  </Box>

                  {/* URL Input */}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      label="Or enter image URL"
                      fullWidth
                      size="small"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhotoCameraIcon sx={{ color: "text.secondary" }} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddImage}
                      disabled={!imageUrl.trim() || !imageUrl.startsWith("http")}
                      sx={{ textTransform: "none", minWidth: 100 }}
                    >
                      Add URL
                    </Button>
                  </Box>
                </Box>
                {formData.images.length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {formData.images.map((url, index) => (
                      <ProductImageItem
                        key={`${url}-${index}`}
                        url={url}
                        index={index}
                        onRemove={() => handleRemoveImage(index)}
                      />
                    ))}
                  </Box>
                )}
                {formData.images.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No images added yet. Add image URLs above.
                  </Typography>
                )}
              </Box>
            </Stack>
            {error && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                <Typography variant="body2" color="error.main">
                  {error}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={handleAddProductClose} 
              disabled={submitting}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProductSubmit}
              variant="contained"
              disabled={submitting}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {submitting ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Product" : "Add Product")}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Toast Notification */}
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseToast}
            severity={toast.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </AdminLayout>
  );
}

import { Router } from "express";
import { prisma } from "../prisma";

export const publicAgentRouter = Router();

/**
 * GET /api/public/product-list
 * Public product list endpoint - no authentication required
 * Returns all active products with variants and inventory information
 */
publicAgentRouter.post("/product-list", async (req, res) => {
  try {
    // Extract query parameters for filtering and pagination
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const inStock = req.query.inStock === "true" ? true : undefined;

    // Build where clause - only show active products
    const where: any = {
      status: "ACTIVE"
    };

    // Apply filters
    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } }
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Fetch products with variants and inventory
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          variants: {
            include: {
              inventory: true
            }
          },
          inventory: true
        }
      }),
      prisma.product.count({ where })
    ]);

    // Format products for public view (exclude cost, include available stock)
    const formattedProducts = products.map(product => {
      // Calculate available stock for product
      let availableStock = 0;
      let isInStock = false;
      let isLowStock = false;

      if (product.variants.length > 0) {
        // For products with variants, sum up all variant inventory
        product.variants.forEach(variant => {
          if (variant.inventory && variant.inventory.length > 0) {
            const variantInventory = variant.inventory[0];
            const available = variantInventory.quantityOnHand - variantInventory.quantityReserved;
            availableStock += available;
          }
        });
      } else {
        // For products without variants, use product-level inventory
        if (product.inventory && product.inventory.length > 0) {
          const productInventory = product.inventory[0];
          availableStock = productInventory.quantityOnHand - productInventory.quantityReserved;
        }
      }

      isInStock = availableStock > 0;
      isLowStock = availableStock > 0 && availableStock < 10;

      // Format variants (exclude cost, include stock info)
      const formattedVariants = product.variants.map(variant => {
        let variantAvailableStock = 0;
        let variantIsInStock = false;
        let variantIsLowStock = false;

        if (variant.inventory && variant.inventory.length > 0) {
          const variantInventory = variant.inventory[0];
          variantAvailableStock = variantInventory.quantityOnHand - variantInventory.quantityReserved;
          variantIsInStock = variantAvailableStock > 0;
          variantIsLowStock = variantAvailableStock > 0 && variantAvailableStock < 10;
        }

        return {
          id: variant.id,
          sku: variant.sku,
          attributes: variant.attributes,
          priceOverride: variant.priceOverride,
          availableStock: variantAvailableStock,
          isInStock: variantIsInStock,
          isLowStock: variantIsLowStock
        };
      });

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        currency: product.currency,
        images: product.images,
        category: product.category,
        tags: product.tags,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        availableStock,
        isInStock,
        isLowStock,
        variants: formattedVariants
      };
    });

    // Apply inStock filter if requested
    let filteredProducts = formattedProducts;
    if (inStock === true) {
      filteredProducts = formattedProducts.filter(p => p.isInStock);
    }

    // Get unique categories
    const categories = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { category: true },
      distinct: ["category"]
    });

    console.log(`Public product list fetched successfully: ${filteredProducts.length} products (page ${page})`);

    res.json({
      success: true,
      products: filteredProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      filters: {
        availableCategories: categories.map(c => c.category).filter(Boolean),
        status: "ACTIVE"
      }
    });
  } catch (error: any) {
    console.error("Error fetching public product list:", error);
    
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch product list",
        code: "INTERNAL_ERROR"
      }
    });
  }
});

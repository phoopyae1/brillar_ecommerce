import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, requireRole, tryRefreshToken } from "../middleware/auth";

export const agentRouter = Router();

// POST endpoint to get customer profile - Customer only
agentRouter.post(
  "/profile",
  tryRefreshToken,
  authenticate,
  requireRole("CUSTOMER"),
  async (req, res) => {
    // STRICT FILTERING: Only show profile for the authenticated customer
    const authenticatedUserId = req.user?.id;

    // Extra safety: ensure userId is present
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication failed. User ID not found in token.",
          code: "AUTHENTICATION_FAILED",
        },
      });
    }

    // Use customerId or userId from request body if provided, otherwise use authenticated user's ID
    const profileCustomerId = req.body.customerId || req.body.userId || authenticatedUserId;

    // Validate customerId format - must be a non-empty string
    if (typeof profileCustomerId !== 'string' || profileCustomerId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          message: "Customer ID must be a non-empty string",
          code: "VALIDATION_ERROR",
        },
      });
    }

    const trimmedCustomerId = String(profileCustomerId).trim();

    // If customerId/userId is provided in body, it must match the authenticated user
    if (req.body.customerId || req.body.userId) {
      if (trimmedCustomerId !== authenticatedUserId) {
        return res.status(403).json({
          success: false,
          error: {
            message: "You are not allowed to view profile for another user",
            code: "FORBIDDEN",
          },
        });
      }
    }

    // Fetch customer profile
    const customer = await prisma.user.findUnique({
      where: { id: trimmedCustomerId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Customer not found",
          code: "NOT_FOUND",
          customerId: trimmedCustomerId,
        },
      });
    }

    // Final defense-in-depth check: ensure role is CUSTOMER
    if (customer.role !== "CUSTOMER") {
      return res.status(403).json({
        success: false,
        error: {
          message: "User is not a customer",
          code: "FORBIDDEN",
          requiredRole: "CUSTOMER",
          userRole: customer.role,
        },
      });
    }

    // Final security check: ensure the customer ID matches authenticated user
    if (customer.id !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: "You are not allowed to view profile for another user",
          code: "FORBIDDEN",
        },
      });
    }

    console.log(`Customer profile fetched successfully: ${trimmedCustomerId}`);

    res.json({
      success: true,
      data: customer,
      customerId: trimmedCustomerId,
    });
  }
);

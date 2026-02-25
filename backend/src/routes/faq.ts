import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";
import jwt from "jsonwebtoken";
import { config } from "../config";

export const faqRouter = Router();

// GET all FAQs (public endpoint, but admins can see all including inactive)
faqRouter.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    
    // Check if user is authenticated and is admin
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        if (decoded && decoded.role === "ADMIN") {
          isAdmin = true;
        }
      } catch (e) {
        // Not a valid token or not admin, continue as public
      }
    }

    const where: any = {};

    // Only filter by isActive for non-admin users
    if (!isAdmin) {
      where.isActive = true;
    }

    if (category) {
      where.category = category as string;
    }

    try {
      const faqs = await prisma.faq.findMany({
        where,
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" }
        ]
      });

      res.json({
        faqs,
        total: faqs.length
      });
    } catch (dbError: any) {
      // Handle case where table doesn't exist
      if (dbError.code === "P2021" || dbError.message?.includes("does not exist")) {
        console.error("FAQ table does not exist. Please run migration:", dbError);
        return res.status(503).json({
          message: "FAQ feature is not set up yet. Please run database migration.",
          error: "DATABASE_TABLE_MISSING",
          details: "Run: npm run db:migrate --workspace backend"
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error fetching FAQs:", error);
    
    // Check if it's a Prisma error about missing table
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      return res.status(500).json({
        message: "FAQ table does not exist. Please run database migration: npm run db:migrate --workspace backend",
        error: "DATABASE_TABLE_MISSING",
        details: error.message
      });
    }
    
    res.status(500).json({
      message: "Failed to fetch FAQs",
      error: error.message
    });
  }
});

// GET single FAQ by ID (public endpoint)
faqRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await prisma.faq.findUnique({
      where: { id }
    });

    if (!faq) {
      return res.status(404).json({
        message: "FAQ not found"
      });
    }

    if (!faq.isActive) {
      return res.status(404).json({
        message: "FAQ not found"
      });
    }

    res.json({ faq });
  } catch (error: any) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({
      message: "Failed to fetch FAQ",
      error: error.message
    });
  }
});

// POST create FAQ (admin only)
faqRouter.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { question, answer, category, order } = req.body;

      if (!question || !answer) {
        return res.status(400).json({
          message: "Question and answer are required",
          received: req.body
        });
      }

      if (typeof question !== "string" || question.trim() === "") {
        return res.status(400).json({
          message: "Question must be a non-empty string"
        });
      }

      if (typeof answer !== "string" || answer.trim() === "") {
        return res.status(400).json({
          message: "Answer must be a non-empty string"
        });
      }

      const faq = await prisma.faq.create({
        data: {
          question: question.trim(),
          answer: answer.trim(),
          category: category?.trim() || null,
          order: order || 0,
          isActive: true
        }
      });

      res.status(201).json({
        message: "FAQ created successfully",
        faq
      });
    } catch (error: any) {
      console.error("Error creating FAQ:", error);
      res.status(500).json({
        message: "Failed to create FAQ",
        error: error.message
      });
    }
  }
);

// PUT update FAQ (admin only)
faqRouter.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { question, answer, category, order, isActive } = req.body;

      // Check if FAQ exists
      const existingFaq = await prisma.faq.findUnique({
        where: { id }
      });

      if (!existingFaq) {
        return res.status(404).json({
          message: "FAQ not found"
        });
      }

      // Build update data
      const updateData: any = {};

      if (question !== undefined) {
        if (typeof question !== "string" || question.trim() === "") {
          return res.status(400).json({
            message: "Question must be a non-empty string"
          });
        }
        updateData.question = question.trim();
      }

      if (answer !== undefined) {
        if (typeof answer !== "string" || answer.trim() === "") {
          return res.status(400).json({
            message: "Answer must be a non-empty string"
          });
        }
        updateData.answer = answer.trim();
      }

      if (category !== undefined) {
        updateData.category = category?.trim() || null;
      }

      if (order !== undefined) {
        updateData.order = typeof order === "number" ? order : 0;
      }

      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const updatedFaq = await prisma.faq.update({
        where: { id },
        data: updateData
      });

      res.json({
        message: "FAQ updated successfully",
        faq: updatedFaq
      });
    } catch (error: any) {
      console.error("Error updating FAQ:", error);
      res.status(500).json({
        message: "Failed to update FAQ",
        error: error.message
      });
    }
  }
);

// DELETE FAQ (admin only)
faqRouter.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const existingFaq = await prisma.faq.findUnique({
        where: { id }
      });

      if (!existingFaq) {
        return res.status(404).json({
          message: "FAQ not found"
        });
      }

      await prisma.faq.delete({
        where: { id }
      });

      res.json({
        message: "FAQ deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting FAQ:", error);
      res.status(500).json({
        message: "Failed to delete FAQ",
        error: error.message
      });
    }
  }
);

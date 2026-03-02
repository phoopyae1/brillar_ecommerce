import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../prisma";

export type TokenPayload = {
  sub: string;
  role: string;
  email: string;
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Special handling for customer-agent endpoints used by chat/AI tools:
  // If there is NO Authorization header but a userId/customerId is provided in the body/query,
  // we authenticate using that userId (only for CUSTOMER role).
  const isCustomerAgentRoute =
    (req.baseUrl && req.baseUrl.includes('customer-agent')) ||
    (req.originalUrl && req.originalUrl.includes('/api/customer-agent')) ||
    (req.path && req.path.startsWith('/api/customer-agent'));

  const userIdFromBody = req.body?.userId || req.body?.customerId;
  const userIdFromQuery = req.query?.userId || req.query?.customerId;

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development' && isCustomerAgentRoute) {
    console.log('Customer-agent route detected:', {
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasUserIdInBody: !!userIdFromBody,
      hasUserIdInQuery: !!userIdFromQuery
    });
  }

  if (!authHeader && isCustomerAgentRoute && (userIdFromBody || userIdFromQuery)) {
    try {
      const userId = userIdFromBody || userIdFromQuery;
      
      // Handle both string UUIDs and numeric IDs
      let customerId: string;
      if (typeof userId === 'string') {
        customerId = userId.trim();
        if (customerId === '') {
          return res.status(401).json({
            success: false,
            error: {
              message: 'Invalid userId provided for authentication',
              code: 'INVALID_USER_ID'
            }
          });
        }
      } else if (typeof userId === 'number') {
        customerId = String(userId);
      } else {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid userId provided for authentication',
            code: 'INVALID_USER_ID'
          }
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User account not found. Please log in again.',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      if (user.role !== 'CUSTOMER') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'This endpoint is only accessible to customers',
            code: 'FORBIDDEN',
            requiredRole: 'CUSTOMER',
            userRole: user.role,
          }
        });
      }

      // Attach user to request and continue without JWT
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role as any,
        name: user.name || null,
      };

      console.log(`User authenticated via userId for customer-agent route: ${user.id} (${user.email})`);
      return next();
    } catch (err: any) {
      console.error('Error during userId-based authentication:', err);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication failed. Please try again.',
          code: 'AUTHENTICATION_FAILED'
        }
      });
    }
  }

  // Standard JWT-based authentication
  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Missing authorization header",
        code: "AUTHORIZATION_HEADER_MISSING"
      }
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Invalid authorization header format. Expected 'Bearer <token>'",
        code: "INVALID_AUTHORIZATION_FORMAT",
        received: authHeader.substring(0, 20) + "..."
      }
    });
  }

  const token = authHeader.slice(7).trim();
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: "Token is empty",
        code: "EMPTY_TOKEN"
      }
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    
    // Validate payload structure
    if (!payload.sub || !payload.role || !payload.email) {
      console.error("Token payload missing required fields:", payload);
      return res.status(401).json({ 
        success: false,
        error: {
          message: "Token payload is invalid",
          code: "INVALID_TOKEN_PAYLOAD"
        }
      });
    }

    // Verify user still exists in database and get latest user data
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User account not found. Token is invalid.',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Verify email matches (additional security check)
    if (payload.email && payload.email !== user.email) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token email mismatch. Please log in again.',
          code: 'TOKEN_EMAIL_MISMATCH'
        }
      });
    }

    // Use database user data (more reliable than token payload)
    // This ensures role changes are reflected immediately
    req.user = { 
      id: user.id, 
      role: user.role as any, 
      email: user.email,
      name: user.name || null
    };
    
    return next();
  } catch (error: any) {
    // Provide more specific error messages
    let errorMessage = "Invalid token";
    let errorCode = "INVALID_TOKEN";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Token has expired. Please log in again or refresh your token.";
      errorCode = "TOKEN_EXPIRED";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token format";
      errorCode = "INVALID_TOKEN_FORMAT";
    } else if (error.name === "NotBeforeError") {
      errorMessage = "Token is not active yet.";
      errorCode = "TOKEN_NOT_ACTIVE";
    }

    console.error("Token verification failed:", {
      error: error.name,
      message: error.message,
      tokenPreview: token.substring(0, 20) + "..."
    });

    return res.status(401).json({ 
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      }
    });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role as any, email: payload.email };
  } catch (error) {
    // ignore invalid token for optional auth
  }
  return next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: {
          message: "Unauthorized - User not authenticated",
          code: "UNAUTHORIZED"
        }
      });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ 
        success: false,
        error: {
          message: `Forbidden - Requires role: ${role}. Your role: ${req.user.role}`,
          code: "FORBIDDEN",
          requiredRole: role,
          userRole: req.user.role
        }
      });
    }
    return next();
  };
}

export function requireAdminOrAgent(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Allow ADMIN role (and AGENT if it exists in the future)
  // For now, only ADMIN is supported
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  return next();
}

/**
 * Middleware that attempts to refresh the access token if it's expired
 * Requires a refreshToken in the request body or headers
 */
export async function tryRefreshToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  // If no auth header, proceed (will fail at authenticate middleware)
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  
  try {
    // Try to verify the token
    jwt.verify(token, config.jwtSecret) as TokenPayload;
    // Token is valid, proceed
    return next();
  } catch (error: any) {
    // If token is expired, try to refresh it
    if (error.name === "TokenExpiredError") {
      // Check for refresh token in body or header
      const refreshToken = req.body?.refreshToken || req.headers["x-refresh-token"] as string || req.headers["refresh-token"] as string;
      
      console.log("Token expired, checking for refresh token:", {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasRefreshTokenInBody: !!req.body?.refreshToken,
        hasRefreshTokenInHeader: !!req.headers["x-refresh-token"] || !!req.headers["refresh-token"]
      });
      
      if (!refreshToken) {
        // No refresh token provided, return expired error with helpful message
        return res.status(401).json({ 
          message: "Token has expired. Please provide a refresh token in the request body as 'refreshToken' or in the header as 'X-Refresh-Token', or log in again to get a new token.",
          error: "TOKEN_EXPIRED",
          canRefresh: false,
          howToRefresh: {
            method1: "Include 'refreshToken' in request body",
            method2: "Include 'X-Refresh-Token' header",
            example: {
              body: { "refreshToken": "your-refresh-token-here" },
              header: "X-Refresh-Token: your-refresh-token-here"
            }
          }
        });
      }

      try {
        // Verify refresh token
        const refreshPayload = jwt.verify(refreshToken, config.jwtRefreshSecret) as { sub: string };
        
        // Check if refresh token exists in database
        const stored = await prisma.refreshToken.findUnique({
          where: { token: refreshToken }
        });

        if (!stored) {
          return res.status(401).json({ 
            message: "Invalid refresh token",
            error: "INVALID_REFRESH_TOKEN"
          });
        }

        // Get user to create new access token
        const user = await prisma.user.findUnique({ 
          where: { id: refreshPayload.sub },
          select: { id: true, role: true, email: true }
        });

        if (!user) {
          return res.status(401).json({ 
            message: "User not found",
            error: "USER_NOT_FOUND"
          });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { sub: user.id, role: user.role, email: user.email },
          config.jwtSecret,
          { expiresIn: "15m" }
        );

        // Set the new token in response header and continue
        res.setHeader("X-New-Access-Token", newAccessToken);
        req.headers.authorization = `Bearer ${newAccessToken}`;
        
        // Set user in request for downstream middleware
        const userWithName = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, email: true, role: true, name: true }
        });
        req.user = { 
          id: userWithName!.id, 
          role: userWithName!.role as any, 
          email: userWithName!.email,
          name: userWithName!.name || null
        };
        
        console.log(`Token refreshed for user: ${user.email}`);
        return next();
      } catch (refreshError: any) {
        console.error("Token refresh failed:", refreshError);
        return res.status(401).json({ 
          message: "Failed to refresh token. Please log in again.",
          error: "REFRESH_FAILED",
          details: process.env.NODE_ENV === "development" ? refreshError.message : undefined
        });
      }
    }
    
    // For other errors, proceed (will be handled by authenticate middleware)
    return next();
  }
}

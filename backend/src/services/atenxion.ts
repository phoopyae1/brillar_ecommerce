import { config } from "../config";
import { connectMongoDB } from "../mongodb";
import { UserIntegration } from "../models/UserIntegration";

const ATENXION_API_URL = config.atenxionApiUrl;

/**
 * Fetches the latest integration embed (token) from MongoDB for the "user" role.
 * Token is extracted from iframeOrScript (token=xxx) or falls back to contextKey.
 */
export async function fetchLatestIntegrationEmbed(): Promise<string> {
  try {
    await connectMongoDB();
    const integration = await UserIntegration.findOne({}).lean();
    if (!integration?.iframeOrScript && !integration?.contextKey) {
      return "";
    }
    const script = integration.iframeOrScript || "";
    const tokenMatch = script.match(/token=([^&"'\s]+)/);
    if (tokenMatch) {
      return tokenMatch[1].trim();
    }
    if (integration.contextKey) {
      return String(integration.contextKey).trim();
    }
    return "";
  } catch (error: any) {
    console.warn("Failed to fetch integration token:", error?.message);
    return "";
  }
}

/**
 * Records a transaction (or event) with Atenxion. Call when:
 * - User completes a purchase (eventType: 'TRANSACTION')
 * - Admin adds a new product (eventType: 'PRODUCT_ADDED')
 * - Admin updates a product (eventType: 'PRODUCT_UPDATED')
 * - Other meaningful changes in the system.
 * Does not throw; logs and returns false on failure so main flow is not broken.
 */
export async function recordAtenxionTransaction(
  userId: string,
  eventType: string = "TRANSACTION"
): Promise<boolean> {
  if (!ATENXION_API_URL) {
    console.warn("⚠️ ATENXION_API_URL not configured - skipping transaction recording");
    return false;
  }

  const url = `${ATENXION_API_URL}/api/post-login/new-transaction`;
  const body = {
    userId: String(userId).trim(),
    eventType
  };

  let atenxionToken = "";

  try {
    atenxionToken = await fetchLatestIntegrationEmbed();
  } catch (error: any) {
    console.warn("Failed to fetch integration token, using fallback:", error?.message);
  }

  if (!atenxionToken || atenxionToken.length === 0) {
    console.warn(
      `⚠️ Atenxion token not found - skipping transaction recording for user ${userId}, event: ${eventType}`
    );
    return false;
  }

  const headers: Record<string, string> = {
    Authorization: atenxionToken,
    "Content-Type": "application/json"
  };

  try {
    console.log("📤 Recording Atenxion transaction:", {
      url,
      userId: body.userId,
      eventType: body.eventType,
      token: atenxionToken ? `${atenxionToken.substring(0, 16)}...` : "none"
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = response.ok ? await response.json().catch(() => ({})) : {};
    if (response.ok) {
      console.log("✅ Transaction recorded successfully:", data);
      return true;
    }

    console.error("❌ Failed to record Atenxion transaction:", {
      userId: body.userId,
      eventType: body.eventType,
      status: response.status,
      data
    });
    return false;
  } catch (error: any) {
    console.error("❌ Failed to record Atenxion transaction:", {
      userId: body.userId,
      eventType: body.eventType,
      error: error?.message ?? error
    });
    return false;
  }
}

/**
 * Notifies Atenxion that a user (admin or customer) has logged out.
 * Call when admin or customer logs out. Does not throw; logs and returns false on failure.
 */
export async function logoutAtenxionUser(
  userId: string,
  token: string | null = null
): Promise<boolean> {
  if (!ATENXION_API_URL) {
    console.warn("⚠️ ATENXION_API_URL not configured - skipping Atenxion logout");
    return false;
  }

  const url = `${ATENXION_API_URL}/api/post-login/user-logout`;

  let atenxionToken = token;
  if (!atenxionToken) {
    try {
      atenxionToken = await fetchLatestIntegrationEmbed();
    } catch (error: any) {
      console.warn("Failed to fetch integration token for logout:", error?.message);
    }
  }

  if (!atenxionToken || atenxionToken.length === 0) {
    console.warn(`⚠️ Atenxion token not found - skipping logout for user ${userId}`);
    return false;
  }

  const body = {
    userId: String(userId).trim(),
    customerId: String(userId).trim()
  };

  const headers: Record<string, string> = {
    Authorization: atenxionToken,
    "Content-Type": "application/json"
  };

  try {
    console.log("📤 Atenxion logout API call:", {
      url,
      body,
      token: atenxionToken ? `${atenxionToken.substring(0, 16)}...` : "none"
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = response.ok ? await response.json().catch(() => ({})) : {};
    if (response.ok) {
      console.log("✅ Atenxion logout successful:", data);
      return true;
    }

    console.error("❌ Atenxion logout failed:", {
      userId: body.userId,
      status: response.status,
      data
    });
    return false;
  } catch (error: any) {
    console.error("❌ Atenxion logout failed:", {
      userId: body.userId,
      error: error?.message ?? error
    });
    return false;
  }
}

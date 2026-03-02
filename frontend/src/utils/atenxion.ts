interface AtenxionCredentials {
  userId?: string | number;
  customerId?: string | number;
  agentId?: string;
  agentchainId?: string;
}

interface AtenxionRequestBody {
  userId: string;
  customerId: string;
  agentId?: string;
  Authorization: string;
}

function resolveServerUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_ATENXION_API_URL || "https://backend.atenxion.ai";
  }
  return process.env.NEXT_PUBLIC_ATENXION_API_URL || "https://api.atenxion.com";
}

function resolveApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

function getHeaders(token: string | null): Record<string, string> | null {
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `${token}`
  };
}

export async function getToken(role: "user" | "admin"): Promise<{ token: string; scriptTag: string } | null> {
  const apiBaseUrl = resolveApiBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${apiBaseUrl}/api/integration/${role}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  const body = (await response.json()) as {
    contextKey?: string | null;
    iframeOrScript?: string | null;
  };

  if (body.contextKey && body.iframeOrScript) {
    return {
      token: body.contextKey,
      scriptTag: body.iframeOrScript // iframeOrScript from MongoDB
    };
  }

  return null;
}

async function normalizeCredentials(
  credentials: AtenxionCredentials,
  role: "user" | "admin"
): Promise<AtenxionRequestBody> {
  // Use userId as primary, fallback to customerId only if userId not provided
  const userId = credentials.userId?.toString().trim() || credentials.customerId?.toString().trim() || "";
  const agentchainId = credentials.agentchainId?.trim();
  // Set customerId to userId (API requires customerId but we use userId value)
  // const customerId = userId;
  let agentId = credentials.agentId;

  // Fetch token and scriptTag from MongoDB based on role
  const integrationData = await getToken(role);
  let resolvedToken: string | null = null;

  if (integrationData?.scriptTag) {
    console.log("[loginAtenxionUser] Extracting token and agentId from MongoDB scriptTag...");

    // Extract token from scriptTag
    const tokenMatch = integrationData.scriptTag.match(/token=([^&"']+)/);
    if (tokenMatch) {
      resolvedToken = tokenMatch[1];
      console.log("[loginAtenxionUser] ✓ Extracted token from scriptTag");
    }

    // Extract agentchainId from scriptTag if agentId not provided
    if (!agentId) {
      const agentIdMatch = integrationData.scriptTag.match(/agentchainId=([^&"']+)/);
      agentId = agentIdMatch ? agentIdMatch[1] : undefined;

      if (agentId) {
        console.log("[loginAtenxionUser] ✓ Extracted agentId (agentchainId) from scriptTag:", agentId);
      } else {
        console.log("[loginAtenxionUser] No agentchainId found in scriptTag");
      }
    }
  }

  // Fallback to contextKey if token not found in scriptTag
  if (!resolvedToken && integrationData?.token) {
    resolvedToken = integrationData.token;
    console.log("[loginAtenxionUser] Using token from contextKey (MongoDB)");
  }

  let userToken = "";
  if (typeof window !== "undefined") {
    // Token is stored directly as a string in localStorage, not as JSON
    const stored = localStorage.getItem("accessToken");
    if (stored) {
      userToken = stored;
    }
  }

  const body: AtenxionRequestBody = {
    userId,
    customerId: userId,
    agentId: agentId || agentchainId,
    Authorization: `Bearer ${userToken}`
  };

  return body;
}

function handleError(error: any, defaultMessage: string): boolean {
  console.error("Atenxion Error:", error);
  if (error instanceof Error) {
    console.error("Atenxion API Error:", {
      message: error.message,
      stack: error.stack
    });
  }
  return false;
}

export async function loginAtenxionUser(
  credentials: AtenxionCredentials,
  role: "user" | "admin"
): Promise<boolean> {
  const url = `${resolveServerUrl()}/api/post-login/user-login`;
  console.log("Atenxion login URL:", url);

  const requestBody = await normalizeCredentials(credentials, role);

  // Get token from MongoDB scriptTag (extracted in normalizeCredentials)
  const integrationData = await getToken(role);
  let resolvedToken: string | null = null;

  if (integrationData?.scriptTag) {
    const tokenMatch = integrationData.scriptTag.match(/token=([^&"']+)/);
    if (tokenMatch) {
      resolvedToken = tokenMatch[1];
    }
  }

  // Fallback to contextKey if token not in scriptTag
  if (!resolvedToken && integrationData?.token) {
    resolvedToken = integrationData.token;
  }

  const headers = getHeaders(resolvedToken);

  console.log("Atenxion API call:", {
    url,
    body: requestBody,
    headers,
    token: resolvedToken ? resolvedToken.substring(0, 20) + "..." : "none"
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers || undefined,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Atenxion API error: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    console.log("Atenxion login response:", responseData);
    return true;
  } catch (error) {
    console.error("Atenxion login failed:", error);
    return handleError(error, "Unable to log in to Atenxion");
  }
}

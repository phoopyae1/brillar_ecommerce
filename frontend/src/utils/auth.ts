"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");
  return !!(accessToken && user);
}

export function getUser(): { id: string; email: string; role: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "ADMIN";
}

function clearAllStorage() {
  if (typeof window === "undefined") return;
  
  // Clear localStorage - all auth-related items
  const localStorageKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes("auth") || 
      key.includes("token") || 
      key.includes("user") ||
      key.includes("refresh") ||
      key.includes("access")
    )) {
      localStorageKeysToRemove.push(key);
    }
  }
  localStorageKeysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage - all auth-related items
  const sessionStorageKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes("auth") || 
      key.includes("token") || 
      key.includes("user") ||
      key.includes("refresh") ||
      key.includes("access")
    )) {
      sessionStorageKeysToRemove.push(key);
    }
  }
  sessionStorageKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  // Clear cookies (if any auth-related cookies exist)
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    if (name.includes("auth") || name.includes("token") || name.includes("user")) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    }
  });
}

export async function logout() {
  if (typeof window === "undefined") return;
  
  const refreshToken = localStorage.getItem("refreshToken");
  
  // Call logout API if refresh token exists
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });
    } catch (error) {
      // Ignore errors - we'll clear storage anyway
      console.error("Logout API error:", error);
    }
  }
  
  // Clear all storage (localStorage, sessionStorage, cookies)
  clearAllStorage();
  
  // Small delay to ensure storage is cleared before redirect
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force a hard redirect to clear all state and ensure fresh page load
  window.location.href = "/";
}

/**
 * Fetch wrapper that automatically includes access token and refresh token
 * Automatically handles token refresh if access token is expired
 * 
 * @example
 * // Basic usage
 * const response = await fetchWithAuth(`${API_URL}/api/admin-agent/update-order-status`, {
 *   method: "POST",
 *   body: JSON.stringify({ orderId: "#DB0B9169", status: "preparing to ship" })
 * });
 * 
 * @example
 * // With custom headers
 * const response = await fetchWithAuth(`${API_URL}/api/admin-agent/orders-list`, {
 *   method: "POST",
 *   headers: { "Custom-Header": "value" },
 *   body: JSON.stringify({ page: 1, pageSize: 20 })
 * });
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (typeof window === "undefined") {
    throw new Error("fetchWithAuth can only be used in the browser");
  }

  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  // Prepare headers
  const headers = new Headers(options.headers);
  
  // Add access token to Authorization header
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Add refresh token to header (for automatic refresh by backend middleware)
  if (refreshToken) {
    headers.set("X-Refresh-Token", refreshToken);
  }

  // Ensure Content-Type is set for JSON requests
  if (!headers.has("Content-Type") && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH")) {
    headers.set("Content-Type", "application/json");
  }

  // Prepare body - if it's JSON and refresh token exists, add it to the body as well
  // (backend checks both header and body for refresh token)
  let body = options.body;
  if (refreshToken && body && typeof body === "string") {
    try {
      const bodyObj = JSON.parse(body);
      // Only add refreshToken if not already present
      if (!bodyObj.refreshToken) {
        bodyObj.refreshToken = refreshToken;
        body = JSON.stringify(bodyObj);
      }
    } catch {
      // If body is not JSON, keep it as is (header will be used)
    }
  }

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
    body: body || options.body
  });

  // Check if we got a new access token in the response header
  // This happens when the backend middleware automatically refreshed the token
  const newAccessToken = response.headers.get("X-New-Access-Token");
  if (newAccessToken) {
    localStorage.setItem("accessToken", newAccessToken);
    console.log("Access token refreshed automatically");
  }

  return response;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

/**
 * Get the current refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

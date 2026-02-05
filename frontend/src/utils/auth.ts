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

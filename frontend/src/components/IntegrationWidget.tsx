"use client";

import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { isAuthenticated, getUser } from "../utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Integration = {
  id: string;
  contextKey: string;
  iframeOrScript: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type ProcessedIframe = {
  integration: Integration;
  src: string;
  title: string;
  allow?: string | null;
  loading?: string | null;
};

function getInitialAuth() {
  if (typeof window === "undefined") return { isLoggedIn: false, userRole: null as string | null };
  const user = getUser();
  return { isLoggedIn: isAuthenticated(), userRole: user?.role ?? null };
}

export function IntegrationWidget() {
  const [publicIntegration, setPublicIntegration] = useState<Integration | null>(null);
  const [userIntegration, setUserIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processedIframes, setProcessedIframes] = useState<ProcessedIframe[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(getInitialAuth().isLoggedIn);
  const [userRole, setUserRole] = useState<string | null>(() => getInitialAuth().userRole);

  // Check authentication and role
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const user = getUser();
      setIsLoggedIn((prev) => prev !== authenticated ? authenticated : prev);
      setUserRole((prev) => {
        const newRole = user?.role || null;
        return prev !== newRole ? newRole : prev;
      });
    };

    checkAuth();
    
    // Listen for storage changes only - no polling
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Fetch public integration only when not logged in (customers/admins only get their own iframe)
  useEffect(() => {
    if (isLoggedIn) {
      setPublicIntegration(null);
      return;
    }

    const fetchPublicIntegration = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/integration/public`);

        if (response.ok) {
          const data = await response.json();
          // Only set public integration if still not logged in (avoid race on /products etc.)
          if (!isAuthenticated()) {
            setPublicIntegration(data);
          }
        } else if (response.status === 404) {
          if (!isAuthenticated()) setPublicIntegration(null);
        } else {
          console.error("Failed to fetch public integration:", response.status);
          if (!isAuthenticated()) setPublicIntegration(null);
        }
      } catch (error) {
        console.error("Error fetching public integration:", error);
        if (!isAuthenticated()) setPublicIntegration(null);
      } finally {
        if (!isAuthenticated()) setLoading(false);
      }
    };

    fetchPublicIntegration();
  }, [isLoggedIn]);

  // Fetch user/admin integration if logged in
  useEffect(() => {
    if (!isLoggedIn || !userRole) {
      setUserIntegration(null);
      setLoading(false);
      return;
    }

    const fetchUserIntegration = async () => {
      try {
        setLoading(true);
        const targetRole = userRole === "ADMIN" ? "admin" : "user";
        const response = await fetch(`${API_URL}/api/integration/${targetRole}`);
        
        if (response.ok) {
          const data = await response.json();
          setUserIntegration(data);
        } else if (response.status === 404) {
          setUserIntegration(null);
        } else {
          console.error("Failed to fetch user integration:", response.status);
          setUserIntegration(null);
        }
      } catch (error) {
        console.error("Error fetching user integration:", error);
        setUserIntegration(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserIntegration();
  }, [isLoggedIn, userRole]);

  // Process script tags for public integration (guests only)
  useEffect(() => {
    if (!publicIntegration || !publicIntegration.iframeOrScript) {
      return;
    }

    const embedCode = publicIntegration.iframeOrScript.trim();
    const integrationId = `public-${publicIntegration.id || Date.now()}`;

    // Handle script tags
    if (embedCode.startsWith("<script")) {
      const scriptId = `integration-script-${integrationId}`;

      // Remove existing script if present
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      // Extract src from script tag
      const scriptTagMatch = embedCode.match(/<script[^>]+src=["']([^"']+)["']/i);

      if (scriptTagMatch) {
        // Extract the script src URL
        let scriptSrc = scriptTagMatch[1];

        // Add userId parameter if user is logged in
        const user = getUser();
        if (user?.id) {
          try {
            const url = new URL(scriptSrc, window.location.origin);
            url.searchParams.set("userId", String(user.id));
            scriptSrc = url.toString();
          } catch {
            const separator = scriptSrc.includes("?") ? "&" : "?";
            scriptSrc = `${scriptSrc}${separator}userId=${String(user.id)}`;
          }
        }

        // Create new script element with updated src
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = scriptSrc;
        script.async = true;
        document.head.appendChild(script);
      } else {
        // Inline script content
        const contentMatch = embedCode.match(/>([\s\S]*?)<\/script>/s);
        if (contentMatch) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.textContent = contentMatch[1];
          document.head.appendChild(script);
        }
      }
    }

    // Cleanup function
    return () => {
      const scriptId = `integration-script-${integrationId}`;
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
      }
    };
  }, [publicIntegration]);

  // Process script tags for user/admin integration (if logged in)
  useEffect(() => {
    if (!userIntegration || !userIntegration.iframeOrScript) {
      // Clean up user scripts when integration is removed
      const scripts = document.querySelectorAll('[id^="integration-script-user-"]');
      scripts.forEach((script) => script.remove());
      return;
    }

    const embedCode = userIntegration.iframeOrScript.trim();
    const integrationId = `user-${userIntegration.id || Date.now()}`;

    // Handle script tags
    if (embedCode.startsWith("<script")) {
      const scriptId = `integration-script-${integrationId}`;

      // Remove existing script if present
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      // Extract src from script tag
      const scriptTagMatch = embedCode.match(/<script[^>]+src=["']([^"']+)["']/i);

      if (scriptTagMatch) {
        let scriptSrc = scriptTagMatch[1];

        // Add userId parameter if user is logged in
        const user = getUser();
        if (user?.id) {
          try {
            const url = new URL(scriptSrc, window.location.origin);
            url.searchParams.set("userId", String(user.id));
            scriptSrc = url.toString();
          } catch {
            const separator = scriptSrc.includes("?") ? "&" : "?";
            scriptSrc = `${scriptSrc}${separator}userId=${String(user.id)}`;
          }
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = scriptSrc;
        script.async = true;
        document.head.appendChild(script);
      } else {
        const contentMatch = embedCode.match(/>([\s\S]*?)<\/script>/s);
        if (contentMatch) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.textContent = contentMatch[1];
          document.head.appendChild(script);
        }
      }
    }

    return () => {
      const scriptId = `integration-script-${integrationId}`;
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
      }
    };
  }, [userIntegration]);

  // Process iframe integrations: for logged-in customers/admins show only their iframe; for guests show only public
  useEffect(() => {
    const allIframes: ProcessedIframe[] = [];

    if (isLoggedIn && userIntegration && userIntegration.iframeOrScript) {
      // Logged in (customer or admin): only load the user/admin iframe — not the public one (stable on refresh)
      const embedCode = userIntegration.iframeOrScript.trim();

      if (embedCode.startsWith("<iframe")) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = embedCode;
        const iframe = wrapper.querySelector("iframe");

        if (iframe) {
          const srcAttr = iframe.getAttribute("src");
          if (srcAttr) {
            let sanitizedSrc = srcAttr.trim();

            const user = getUser();
            if (user?.id) {
              try {
                const url = new URL(sanitizedSrc, window.location.origin);
                url.searchParams.set("userId", String(user.id));
                sanitizedSrc = url.toString();
              } catch {
                if (!sanitizedSrc.includes("userId=")) {
                  const separator = sanitizedSrc.includes("?") ? "&" : "?";
                  sanitizedSrc = `${sanitizedSrc}${separator}userId=${String(user.id)}`;
                }
              }
            }

            allIframes.push({
              integration: userIntegration,
              src: sanitizedSrc,
              title: iframe.getAttribute("title") || (userRole === "ADMIN" ? "Admin Agent" : "Customer Agent"),
              allow: iframe.getAttribute("allow"),
              loading: iframe.getAttribute("loading")
            });
          }
        }
      }
    } else if (!isLoggedIn && publicIntegration && publicIntegration.iframeOrScript) {
      // Not logged in: only load the public iframe
      const embedCode = publicIntegration.iframeOrScript.trim();

      if (embedCode.startsWith("<iframe")) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = embedCode;
        const iframe = wrapper.querySelector("iframe");

        if (iframe) {
          const srcAttr = iframe.getAttribute("src");
          if (srcAttr) {
            const sanitizedSrc = srcAttr.trim();
            allIframes.push({
              integration: publicIntegration,
              src: sanitizedSrc,
              title: iframe.getAttribute("title") || "Public Agent",
              allow: iframe.getAttribute("allow"),
              loading: iframe.getAttribute("loading")
            });
          }
        }
      }
    }

    setProcessedIframes(allIframes);
    setLoading(false);
  }, [publicIntegration, userIntegration, isLoggedIn, userRole]);

  // Don't render anything if loading or no iframes found
  // Public agent should load even when not logged in
  if (loading || processedIframes.length === 0) {
    return null;
  }

  return (
    <>
      {processedIframes.map((iframeData) => (
        <Box
          key={`iframe-${iframeData.integration.role}-${iframeData.integration.id || iframeData.integration.contextKey}`}
          component="div"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            width: "400px",
            height: "600px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 32px)",
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            "@media (max-width: 600px)": {
              width: "calc(100vw - 32px)",
              height: "calc(100vh - 32px)",
              bottom: 16,
              right: 16
            }
          }}
        >
          <iframe
            src={iframeData.src}
            title={iframeData.title}
            allow={iframeData.allow || undefined}
            loading={
              iframeData.loading === "lazy" || iframeData.loading === "eager"
                ? iframeData.loading
                : "lazy"
            }
            style={{
              width: "100%",
              height: "100%",
              border: "none"
            }}
          />
        </Box>
      ))}
    </>
  );
}

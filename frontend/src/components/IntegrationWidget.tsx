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

export function IntegrationWidget() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processedIframes, setProcessedIframes] = useState<ProcessedIframe[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check authentication and role
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const user = getUser();
      setIsLoggedIn(authenticated);
      setUserRole(user?.role || null);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine which role to load integration for
  const targetRole = React.useMemo(() => {
    if (!isLoggedIn || !userRole) return null;
    // Load "user" integration for regular users, "admin" integration for admins
    return userRole === "ADMIN" ? "admin" : "user";
  }, [isLoggedIn, userRole]);

  // Fetch integration based on role
  useEffect(() => {
    if (!targetRole) {
      setLoading(false);
      setIntegration(null);
      return;
    }

    const fetchIntegration = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/integration/${targetRole}`);
        
        if (response.ok) {
          const data = await response.json();
          setIntegration(data);
        } else if (response.status === 404) {
          // No integration found for this role
          setIntegration(null);
        } else {
          console.error("Failed to fetch integration:", response.status);
          setIntegration(null);
        }
      } catch (error) {
        console.error("Error fetching integration:", error);
        setIntegration(null);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegration();
  }, [targetRole]);

  // Process script tags and inject them
  useEffect(() => {
    if (!integration || !integration.iframeOrScript) {
      // Clean up scripts when integration is removed
      const scripts = document.querySelectorAll('[id^="integration-script-"]');
      scripts.forEach((script) => script.remove());
      return;
    }

    const embedCode = integration.iframeOrScript.trim();
    const integrationId = integration.id || `integration-${Date.now()}`;

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
  }, [integration]);

  // Process iframe integrations
  useEffect(() => {
    if (!integration || !integration.iframeOrScript) {
      setProcessedIframes([]);
      return;
    }

    const embedCode = integration.iframeOrScript.trim();

    // Only process if it's an iframe
    if (!embedCode.startsWith("<iframe")) {
      setProcessedIframes([]);
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = embedCode;
    const iframe = wrapper.querySelector("iframe");

    if (!iframe) {
      setProcessedIframes([]);
      return;
    }

    const srcAttr = iframe.getAttribute("src");
    if (!srcAttr) {
      setProcessedIframes([]);
      return;
    }

    let sanitizedSrc = srcAttr.trim();

    // Inject userId into iframe URL if user is logged in
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

    const processedIframe: ProcessedIframe = {
      integration,
      src: sanitizedSrc,
      title: iframe.getAttribute("title") || "Integration Widget",
      allow: iframe.getAttribute("allow"),
      loading: iframe.getAttribute("loading")
    };

    setProcessedIframes([processedIframe]);
  }, [integration]);

  // Don't render anything if loading, not logged in, or no iframes found
  if (loading || !isLoggedIn || processedIframes.length === 0) {
    return null;
  }

  return (
    <>
      {processedIframes.map((iframeData, index) => (
        <Box
          key={iframeData.integration.id || `iframe-${index}`}
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

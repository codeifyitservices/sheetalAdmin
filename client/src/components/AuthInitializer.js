"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { initializeAuth } from "@/store/slices/authSlice";

// Global fetch interceptor to automatically add Authorization header for API calls
if (typeof window !== "undefined" && !window.__fetchIntercepted) {
  window.__fetchIntercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async function (resource, options) {
    const url = typeof resource === "string" ? resource : resource?.url || "";
    const token = localStorage.getItem("token");
    
    let newOptions = options || {};
    let newResource = resource;

    if (token && url.includes("/api/v1")) {
      const headers = new Headers(newOptions.headers || {});
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      newOptions = { ...newOptions, headers };
      
      if (typeof resource !== "string" && resource instanceof Request) {
        newResource = new Request(resource, { headers });
      }
    }
    
    return originalFetch.call(this, newResource, newOptions);
  };
}

export default function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth()).then((result) => {
      if (initializeAuth.rejected.match(result)) {
        const reason = result.payload;
        // "No token" means the user was never logged in — nothing to clear
        // Any other rejection means the token exists but is invalid/expired
        if (reason !== "No token") {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
          // Clear the cookie so middleware stops seeing the stale token
          document.cookie = "token=; path=/; max-age=0";
        }
      }
    });
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return children;
}

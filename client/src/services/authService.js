import { API_BASE_URL } from "./api";

// login
export const adminLogin = async ({ email, password }) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
};

// logout
export const adminLogout = async () => {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Logout failed");
  return data;
};

// get auth status
export const getAuthStatus = async () => {
  // Send the token via both cookie (credentials: include) and Authorization header.
  // The server's isAuthenticated middleware accepts either. The Bearer header is the
  // reliable fallback when the httpOnly SameSite=None cookie isn't sent cross-origin.
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/auth/status`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "Auth status check failed");
    err.status = res.status; // carry HTTP status so callers can distinguish 401/403 from network errors
    throw err;
  }
  return data;
};

// login
export const userLogin = async ({ email, password }) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
};

export const userRegister = async ({ name, email, password }) => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
};

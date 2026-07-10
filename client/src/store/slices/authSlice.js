import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAuthStatus } from "@/services/authService";

export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, { rejectWithValue }) => {
    try {
      // If no token in localStorage, skip API call — user is not logged in
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return rejectWithValue("No token");

      const data = await getAuthStatus();
      if (!data?.user) return rejectWithValue("No user in response");
      return data;
    } catch (error) {
      // Pass both message and HTTP status so AuthInitializer can decide whether to clear the token
      return rejectWithValue(error.message || "Auth failed");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: true, // Start with loading true
    error: null,
  },

  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        const reason = action.payload;

        // "No token" = genuinely not logged in
        if (reason === "No token") {
          state.user = null;
          state.isAuthenticated = false;
          state.loading = false;
          return;
        }

        // Server explicitly rejected the token (invalid/expired message)
        const isServerRejection =
          typeof reason === "string" &&
          (reason.toLowerCase().includes("invalid") ||
            reason.toLowerCase().includes("expired") ||
            reason.toLowerCase().includes("unauthorized") ||
            reason.toLowerCase().includes("login required"));

        if (isServerRejection) {
          // Token is bad — log the user out
          state.user = null;
          state.isAuthenticated = false;
        } else {
          // Network error / server timeout / cold start — token may still be valid.
          // Keep user authenticated using stored token so they don't get kicked out.
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          if (token) {
            state.isAuthenticated = true;
            // user details unknown until next successful check, but keep them in
          } else {
            state.user = null;
            state.isAuthenticated = false;
          }
        }

        state.loading = false;
      });
  },
});

export const { setCredentials, logout, setLoading, setError } =
  authSlice.actions;

export default authSlice.reducer;

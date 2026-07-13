"use client";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setCredentials, setError } from "@/store/slices/authSlice";
import { adminLogin, getAuthStatus } from "@/services/authService";
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useSettings from "@/hooks/useSettings";

export default function AdminLogin() {
  const { settings } = useSettings();
  const logoUrl = settings?.logo?.url;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const data = await getAuthStatus();
        if (data?.user && data.user.role?.toLowerCase() === "admin") {
          dispatch(setCredentials({ user: data.user }));
          router.push("/admin");
        }
      } catch (err) {
        // Only clear token if the server explicitly rejected it (401/403)
        // Don't wipe localStorage on a generic network error — user may still be valid
        const status = err?.status || err?.response?.status;
        if (status === 401 || status === 403) {
          document.cookie = "token=; path=/; max-age=0";
          if (typeof window !== "undefined") localStorage.removeItem("token");
        }
      }
    };

    checkExistingAuth();
  }, [dispatch, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await adminLogin({ email, password });

      if (!data?.data?.token || !data?.data?.user) {
        throw new Error("Unexpected response from server. Please try again.");
      }

      // Store token in localStorage for the auth initializer check
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.data.token);
      }

      dispatch(
        setCredentials({
          user: data.data.user,
        }),
      );
      toast.success("Login successful");
      router.push("/admin");
    } catch (err) {
      toast.error(err.message || "Invalid email or password");
      dispatch(setError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] p-4 antialiased">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-10">
          <div className="mb-8 text-center flex flex-col items-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto object-contain mb-6"
              />
            ) : (
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md mb-6">
                <span className="font-bold text-xl text-white">S</span>
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Admin Login
            </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-0.5">
                Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />
                <input
                  type="email"
                  required
                  className="w-full bg-white border border-slate-200 text-slate-900 pl-11 pr-4 py-2.5 rounded-lg text-sm focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-0.5">
                Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-white border border-slate-200 text-slate-900 pl-11 pr-12 py-2.5 rounded-lg text-sm focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 mt-2 active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Loading...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

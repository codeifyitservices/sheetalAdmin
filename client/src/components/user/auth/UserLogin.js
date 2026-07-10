"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { setCredentials, setError } from "@/store/slices/authSlice";
import { userLogin } from "@/services/authService";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const UserLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await userLogin({ email, password });

      const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `token=${data.data.token}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.data.token);
      }

      dispatch(
        setCredentials({
          user: data.data.user,
        }),
      );
      toast.success("Welcome back! Login successful.");
      router.push("/");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Invalid credentials provided";
      toast.error(errorMessage);
      dispatch(setError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white antialiased">
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070"
          alt="Luxury Fashion Brand Background"
        />
        <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
        <div className="absolute bottom-12 left-12 text-white max-w-sm">
          <h1 className="text-5xl font-serif font-light tracking-tight italic">
            Summer '26
          </h1>
          <p className="mt-4 text-sm font-light tracking-[0.3em] uppercase opacity-80 leading-relaxed">
            Exclusive Curator Access & Global Style Portfolio
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:flex-none lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-serif font-medium tracking-tight text-gray-900">
              Sign In
            </h2>
            <p className="mt-4 text-sm text-gray-500 leading-relaxed font-light">
              Enter your credentials to access your luxury dashboard or{" "}
              <Link
                href="/register"
                className="font-medium text-black hover:underline underline-offset-4 decoration-1 transition-all"
              >
                create a profile
              </Link>
            </p>
          </div>

          <div className="mt-12">
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="group">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 group-focus-within:text-black transition-colors">
                  Email Address
                </label>
                <div className="mt-1 flex items-center border-b border-gray-200 py-3 group-focus-within:border-black transition-all duration-300">
                  <Mail className="h-4 w-4 text-gray-800 group-focus-within:text-black transition-colors" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none bg-transparent px-4 text-gray-900 focus:outline-none sm:text-sm placeholder:text-gray-200"
                    placeholder="name@domain.com"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 group-focus-within:text-black transition-colors">
                  Password
                </label>
                <div className="mt-1 flex items-center border-b border-gray-200 py-3 group-focus-within:border-black transition-all duration-300">
                  <Lock className="h-4 w-4 text-gray-800 group-focus-within:text-black transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none bg-transparent px-4 text-gray-900 focus:outline-none sm:text-sm placeholder:text-gray-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-800 hover:text-black transition-colors px-2"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-800 hover:text-black transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 bg-black px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[9px] text-gray-800 uppercase tracking-[0.2em] font-light">
                &copy; 2026 All Rights Reserved.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/privacy"
                  className="text-[9px] text-gray-700 hover:text-black uppercase tracking-widest transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-[9px] text-gray-700 hover:text-black uppercase tracking-widest transition-colors"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;

"use client";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminLogout } from "@/services/authService";

export default function useLogout() {
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await adminLogout();
      toast.success("Logged out successfully");
    } catch (err) {
      // Server logout failed — still proceed with local cleanup
      console.error("Logout API error:", err);
    } finally {
      document.cookie = "token=; path=/; max-age=0";
      if (typeof window !== "undefined") localStorage.removeItem("token");
      dispatch(logout());
      router.push("/admin/login");
    }
  };

  return handleLogout;
}

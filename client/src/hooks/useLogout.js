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
      // Clear client-side cookie
      document.cookie = "token=; path=/; max-age=0";
      document.cookie = "token=; path=/; max-age=0; SameSite=None; Secure";
      document.cookie = "token=; path=/; max-age=0; SameSite=Lax; Secure";
      dispatch(logout());
      toast.success("Logged out successfully");
      router.push("/admin/login");
    } catch (err) {
      toast.error(err.message || "Failed to logout");
    }
  };

  return handleLogout;
}

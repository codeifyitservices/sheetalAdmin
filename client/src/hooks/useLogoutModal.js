"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminLogout } from "@/services/authService";

export default function useLogoutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await adminLogout();
      toast.success("Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      // Continue with local logout anyway
    } finally {
      document.cookie = "token=; path=/; max-age=0";
      dispatch(logout());
      router.push("/admin/login");
      closeModal();
      setIsLoggingOut(false);
    }
  };

  const LogoutModal = () =>
    isOpen && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-slate-900">
            Confirm Logout
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Are you sure you want to logout?
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={isLoggingOut}
              className="px-4 py-2 cursor-pointer rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 cursor-pointer rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-70 disabled:cursor-pointer"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    );

  return { openModal, LogoutModal };
}

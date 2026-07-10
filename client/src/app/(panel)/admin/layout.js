"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import Sidebar from "@/components/admin/layout/Sidebar";
import TopNav from "@/components/admin/layout/TopNav";
import useLogoutModal from "@/hooks/useLogoutModal";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const isLoginPage = pathname === "/admin/login";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { openModal, LogoutModal } = useLogoutModal();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    // Intercept global fetch calls to catch 401 (Unauthorized) errors from expired tokens
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (
          !url.includes("/auth/status") &&
          !url.includes("/auth/login") &&
          !window.location.pathname.includes("/admin/login")
        ) {
          // Clear all cookie variants
          document.cookie = "token=; path=/; max-age=0";
          document.cookie = "token=; path=/; max-age=0; SameSite=None; Secure";
          document.cookie = "token=; path=/; max-age=0; SameSite=Lax; Secure";
          dispatch(logout());
          router.push("/admin/login");
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [dispatch, router]);



  if (!mounted) {
    return <div className="h-screen bg-[#fcfcfd]" />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex bg-[#fcfcfd] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        storeName="Admin"
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Right Side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopNav */}
        <div className="sticky top-0 z-30 print:hidden">
          <TopNav
            storeName="Admin"
            setIsOpen={setIsSidebarOpen}
            openLogoutModal={openModal}
          />
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-[#f1f5f9] p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
      <LogoutModal />
    </div>
  );
}

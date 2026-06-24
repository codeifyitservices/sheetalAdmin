"use client";

import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  X,
  ShoppingCart,
  ListTree,
  Star,
  TicketPercent,
  Monitor,
  Newspaper,
  ChartNoAxesCombined,
  ChevronDown,
  BarChart2,
  FileText,
  TrendingUp,
  Layout,
  BookOpen,
  UserIcon,
  ClipboardClock,
  Home,
  Headset,
  Eye,
  MessageSquare,
  BadgeIndianRupee,
  InfoIcon,
  Truck,
  Settings,
  Mail,
  Search,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import useSettings from "@/hooks/useSettings";

export default function Sidebar({ storeName = "Admin", isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const logoUrl = settings?.logo?.url;

  const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: ListTree, label: "Categories", href: "/admin/categories" },
    { icon: ShoppingBag, label: "Products", href: "/admin/products" },
    { icon: Users, label: "Customers", href: "/admin/customers" },
    { icon: TicketPercent, label: "Coupons", href: "/admin/coupons" },
    { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
    {
      icon: ChartNoAxesCombined,
      label: "Sales & Reports",
      href: "/admin/sales-report",
      children: [
        {
          icon: TrendingUp,
          label: "Best Selling Products",
          href: "/admin/sales-report/best-selling",
        },
        {
          icon: Eye,
          label: "Most Viewed Products",
          href: "/admin/sales-report/most-viewed",
        },
        {
          icon: Users,
          label: "Traffic Source",
          href: "/admin/sales-report/traffic",
        },
        {
          icon: ShoppingCart,
          label: "Abandoned Carts",
          href: "/admin/sales-report/abandoned-carts",
        },
      ],
    },
    {
      icon: ClipboardClock,
      label: "Appointments",
      href: "/admin/appointments",
    },
    { icon: Headset, label: "Notify Enquiries", href: "/admin/notify-enquiry" },
    {
      icon: MessageSquare,
      label: "Contact Enquiries",
      href: "/admin/contact-enquiry",
    },
    {
      icon: Mail,
      label: "Newsletter",
      href: "/admin/newsletter",
    },
    { icon: Star, label: "Reviews", href: "/admin/reviews" },
    { icon: Newspaper, label: "Blogs", href: "/admin/blogs" },
    {
      icon: Monitor,
      label: "Site Content",
      href: "#",
      children: [
        { icon: Home, label: "Homepage", href: "/admin/cms/homepage" },
        { icon: Layout, label: "Banners", href: "/admin/cms/banners" },
        { icon: BookOpen, label: "Lookbooks", href: "/admin/cms/lookbooks" },
        { icon: FileText, label: "Text Pages", href: "/admin/cms/pages" },
        { icon: HelpCircle, label: "FAQ", href: "/admin/cms/faq" },
        { icon: Search, label: "SEO Settings", href: "/admin/cms/seo-settings" },
        {
          icon: UserIcon,
          label: "Testimonials",
          href: "/admin/cms/testimonials",
        },
      ],
    },
    {
      icon: Truck,
      label: "Delivery & Returns",
      href: "/admin/delivery-returns",
    },
    {
      icon: InfoIcon,
      label: "Invoice Info",
      href: "/admin/invoice-info",
    },
    { icon: Monitor, label: "Navbar & Footer", href: "/admin/navbar-footer" },
    { icon: ListTree, label: "Size Chart", href: "/admin/size-chart" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 text-slate-600 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
            <Link href="/admin" className="flex items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="font-bold text-base text-white leading-none">
                    {storeName?.[0] || "A"}
                  </span>
                </div>
              )}
              <span className="text-base font-bold tracking-tight text-slate-900">
                {storeName}
                <span className="text-indigo-500">Panel</span>
              </span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                setIsOpen={setIsOpen}
              />
            ))}
          </nav>
        </div>
      </aside>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </>
  );
}

function NavItem({ item, pathname, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = item.icon;

  const isActive =
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));

  if (!item.children) {
    return (
      <Link
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group ${
          isActive
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Icon
          size={17}
          className={
            isActive
              ? "text-white"
              : "text-slate-400 group-hover:text-slate-600 transition-colors"
          }
        />
        <span className="flex-1">{item.label}</span>
      </Link>
    );
  }

  const isParentActive = item.children.some(
    (child) => pathname === child.href || pathname.startsWith(child.href),
  );

  const handleChevronClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div>
      <Link
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group ${
          isParentActive
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Icon
          size={17}
          className={
            isParentActive
              ? "text-white"
              : "text-slate-400 group-hover:text-slate-600 transition-colors"
          }
        />
        <span className="flex-1">{item.label}</span>
        <span
          onClick={handleChevronClick}
          className="hover:bg-white/30 rounded w-4 h-4 flex items-center justify-center"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"} ${
              isParentActive ? "text-white/70" : "text-slate-400"
            }`}
          />
        </span>
      </Link>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5 py-1">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const isChildActive =
              pathname === child.href || pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
                  isChildActive
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <ChildIcon
                  size={15}
                  className={
                    isChildActive
                      ? "text-indigo-500"
                      : "text-slate-400 group-hover:text-slate-600"
                  }
                />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import PageHeader from "@/components/admin/layout/PageHeader";

export default function PagesCMS() {
  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500 pb-20">
      <PageHeader
        title="Pages Management"
        subtitle="Edit static site content"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Link
          href="/admin/cms/pages/about"
          className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 transition-colors group-hover:bg-amber-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
            About Us
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Edit founder story, mission, and vision
          </p>
        </Link>

        <Link
          href="/admin/cms/pages/terms-and-conditions"
          className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 transition-colors group-hover:bg-indigo-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
            Terms & Conditions
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Edit user agreement, platform policies, and rules
          </p>
        </Link>

        <Link
          href="/admin/cms/pages/privacy-policy"
          className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 transition-colors group-hover:bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
            Privacy Policy
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Edit data protection rules, privacy claims, and terms
          </p>
        </Link>

        <Link
          href="/admin/cms/pages/shipping-policy"
          className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4 transition-colors group-hover:bg-sky-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7h13v10H3z" />
              <path d="M16 10h3l2 2v5h-5z" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="17.5" cy="17.5" r="1.5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
            Shipping Policy
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Edit delivery timelines, charges, and shipment terms
          </p>
        </Link>

        <Link
          href="/admin/cms/pages/return-exchange-policy"
          className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 transition-colors group-hover:bg-rose-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
            Return & Exchange Policy
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Edit return windows, exchange rules, and refund terms
          </p>
        </Link>
      </div>
    </div>
  );
}

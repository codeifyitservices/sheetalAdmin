"use client";
import { useState, useEffect } from "react";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
import Link from "next/link";
import {
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Star,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/admin/layout/PageHeader.js";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDashboardStats } from "@/services/adminService";

const dataOptions = {
  weekly: [
    { name: "Mon", sales: 4000 },
    { name: "Tue", sales: 3000 },
    { name: "Wed", sales: 5000 },
    { name: "Thu", sales: 2780 },
    { name: "Fri", sales: 1890 },
    { name: "Sat", sales: 6390 },
    { name: "Sun", sales: 7490 },
  ],
  monthly: [
    { name: "Week 1", sales: 25000 },
    { name: "Week 2", sales: 32000 },
    { name: "Week 3", sales: 28000 },
    { name: "Week 4", sales: 45000 },
  ],
};

export default function AdminDashboard() {
  const [view, setView] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    todayOrders: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const scrollStyle = "overflow-y-auto pr-2 custom-scrollbar";

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500 ">
      <div className="max-w-[1600px] mx-auto ">
        <PageHeader
          title="Executive Dashboard"
          subtitle="Real-time Store Insights & Analytics"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {[
            {
              label: "Total Revenue",
              val: formatCurrency(stats.totalOrders * 2499),
              status: "Live Estimate",
              icon: <DollarSign size={20} />,
              color: "text-emerald-700",
              bg: "bg-emerald-100",
            },
            {
              label: "Total Orders",
              val: stats.totalOrders.toLocaleString(),
              status: `+${stats.todayOrders} Today`,
              icon: <ShoppingCart size={20} />,
              color: "text-blue-700",
              bg: "bg-blue-100",
            },
            {
              label: "Active Users",
              val: stats.activeUsers.toLocaleString(),
              status: "Currently Online",
              icon: <Users size={20} />,
              color: "text-indigo-700",
              bg: "bg-indigo-100",
            },
            {
              label: "Total Customers",
              val: stats.totalUsers.toLocaleString(),
              status: "Lifetime Growth",
              icon: <UserPlus size={20} />,
              color: "text-orange-700",
              bg: "bg-orange-100",
            },
          ].map((stat, i) => (
            <AdminStatCard
              key={i}
              title={stat.label}
              value={loading ? "..." : stat.val}
              icon={stat.icon}
              subtext={
                <span className="inline-flex text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  {stat.status}
                </span>
              }
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* Sales Graph */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Revenue Flow
                </h3>
                <p className="text-sm font-medium text-emerald-600">
                  Performance is up by 12%
                </p>
              </div>
              <select
                value={view}
                onChange={(e) => setView(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-xs font-bold px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-sm hover:border-slate-400 transition-all appearance-none"
                style={{ minWidth: "140px" }}
              >
                <option
                  value="weekly"
                  className="text-slate-900 font-bold bg-white"
                >
                  WEEKLY REPORT
                </option>
                <option
                  value="monthly"
                  className="text-slate-900 font-bold bg-white"
                >
                  MONTHLY REPORT
                </option>
              </select>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dataOptions[view]}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: "#64748b" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="lg:col-span-5 bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
            <div className="p-7 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                Recent Activity
              </h3>
              <Link
                href="/orders"
                className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
              >
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className={`flex-1 ${scrollStyle}`}>
              <table className="w-full">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left">Customer</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...Array(8)].map((_, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          User_{i + 100}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          Order #TXN-99{i}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                          Processing
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                        ₹2,499
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Row Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {/* Registrations */}
          <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
              <UserPlus size={20} className="text-indigo-600" /> New
              Registrations
            </h3>
            <div className={`flex-1 ${scrollStyle} space-y-4`}>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    U
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      New Customer
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Joined 2h ago
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock */}
          <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
              <Package size={20} className="text-blue-500" /> Stock Analytics
            </h3>
            <div className={`flex-1 ${scrollStyle} space-y-5`}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-slate-800">
                      Product Line {i + 1}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
                      Healthy
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full w-[80%] rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
              <Star size={20} className="text-orange-500" /> Recent Feedback
            </h3>
            <div className={`flex-1 ${scrollStyle} space-y-4`}>
              <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-2xl">
                <div className="flex gap-1 mb-3 text-orange-500">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                  "Excellent service and fast delivery. The product quality
                  exceeded my expectations!"
                </p>
                <p className="text-xs font-bold text-slate-900 mt-4 uppercase">
                  — Verified Buyer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

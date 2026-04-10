"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  IndianRupee,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  TrendingUp,
  Eye,
} from "lucide-react";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import DateRangeControl from "@/components/admin/common/DateRangeControl";
import PageHeader from "@/components/admin/layout/PageHeader";
import AbandonedCartDetailsModal from "@/components/admin/sales/AbandonedCartDetailsModal";
import AbandonedCartStepsModal from "@/components/admin/sales/AbandonedCartStepsModal";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";
import { getAbandonedCarts } from "@/services/salesService";
import { getCoupons } from "@/services/couponService";
import { getPaginationRange } from "@/utils/pagination";
import { useDateRange } from "@/hooks/useDateRange";

const LIMIT_OPTIONS = [5, 10, 25];

export default function AbandonedCartsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const limitFromUrl = parseInt(searchParams.get("limit")) || 10;
  const pageFromUrl = parseInt(searchParams.get("page")) || 1;

  const [limit, setLimit] = useState(
    LIMIT_OPTIONS.includes(limitFromUrl) ? limitFromUrl : 10,
  );
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [allCarts, setAllCarts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCart, setSelectedCart] = useState(null);
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    totalValue: 0,
    recoveredAmount: 0,
    recoveredRevenue: 0,
    retentionRate: 0,
  });

  const {
    rangeType,
    setRangeType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
    dateRangeLabel,
  } = useDateRange("last_7_days");

  const tableDateRange = useMemo(
    () => ({
      startDate: dateRange.startDate.toISOString().split("T")[0],
      endDate: dateRange.endDate.toISOString().split("T")[0],
    }),
    [dateRange.endDate, dateRange.startDate],
  );

  // Fetch coupons once on mount so the Steps Modal can show the
  // active abandoned-cart recovery coupon.
  useEffect(() => {
    getCoupons(1, 100, "")
      .then((res) => {
        if (res.success) setCoupons(res.data);
      })
      .catch(() => {}); // non-critical, modal shows empty state gracefully
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAbandonedCarts({
        limit: 1000,
        includeRecovered: true,
        startDate: tableDateRange.startDate,
        endDate: tableDateRange.endDate,
      });
      const data = res.data || [];
      setAllCarts(data);

      const totalValue = data.reduce(
        (sum, cart) => sum + Number(cart.cartValue || 0),
        0,
      );

      setStats({
        total: Number(res.abandonedCount || 0),
        totalValue: Math.round(totalValue * 100) / 100,
        recoveredAmount:
          Math.round(Number(res.recoveredAmount || 0) * 100) / 100,
        recoveredRevenue:
          Math.round(Number(res.recoveredRevenue || 0) * 100) / 100,
        retentionRate: Number(res.retentionRate || 0),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableDateRange.endDate, tableDateRange.startDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const syncUrl = (l, p) =>
    router.replace(`/admin/sales-report/abandoned-carts?limit=${l}&page=${p}`);
  const handleLimitChange = (l) => {
    setLimit(l);
    setCurrentPage(1);
    syncUrl(l, 1);
  };
  const handlePageChange = (p) => {
    setCurrentPage(p);
    syncUrl(limit, p);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, tableDateRange.endDate, tableDateRange.startDate]);

  const filteredCarts = useMemo(() => {
    if (statusFilter === "abandoned") {
      return allCarts.filter((cart) => cart.status === "abandoned");
    }
    if (statusFilter === "recovered") {
      return allCarts.filter((cart) => cart.status === "recovered");
    }
    return allCarts;
  }, [allCarts, statusFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCarts.length / limit));
    if (currentPage > totalPages) {
      setCurrentPage(1);
      router.replace(
        `/admin/sales-report/abandoned-carts?limit=${limit}&page=1`,
      );
    }
  }, [currentPage, filteredCarts.length, limit, router]);

  const paginatedCarts = filteredCarts.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );
  const totalPages = Math.ceil(filteredCarts.length / limit);

  const handleExport = async (format) => {
    if (filteredCarts.length === 0) return;

    setIsExporting(true);
    try {
      const columns = [
        { key: "#", label: "#" },
        { key: "Customer", label: "Customer" },
        { key: "Name", label: "Name" },
        { key: "Phone", label: "Phone" },
        { key: "Items", label: "Items" },
        { key: "Cart Value", label: "Cart Value" },
        { key: "Status", label: "Status" },
        { key: "Date", label: "Date" },
        { key: "Recovered At", label: "Recovered At" },
        { key: "Recovered Step", label: "Recovered Step" },
      ];

      const rows = filteredCarts.map((cart, index) => ({
        "#": String(index + 1).padStart(2, "0"),
        Customer: cart.email || cart.name || "Unknown",
        Name: cart.name || "-",
        Phone: cart.phoneNumber || "-",
        Items: `${cart.itemCount} item${cart.itemCount !== 1 ? "s" : ""}`,
        "Cart Value": `Rs. ${Number(cart.cartValue || 0).toFixed(2)}`,
        Status: cart.status === "recovered" ? "Recovered" : "Abandoned",
        Date: cart.date || "-",
        "Recovered At": cart.recoveredAt || "-",
        "Recovered Step": cart.recoveredAtStep || "-",
      }));

      const filename = `abandoned_carts_${statusFilter}_${tableDateRange.startDate || "all"}_${tableDateRange.endDate || "all"}`;

      if (format === "pdf") {
        await downloadPdfReport({
          filename,
          title: "Abandoned Carts Report",
          meta: [
            `Status Filter: ${statusFilter}`,
            `Date Range: ${dateRangeLabel}`,
            `Generated on: ${new Date().toLocaleString()}`,
            `Rows: ${rows.length}`,
          ],
          columns,
          rows,
        });
      } else {
        downloadCsvReport({ filename, columns, rows });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Abandoned Carts"
        subtitle="Customers currently in the abandoned-cart recovery flow"
        action={
          <div className="flex items-center gap-2">
            <ReportExportMenu
              busy={isExporting}
              disabled={loading || filteredCarts.length === 0}
              onExportPdf={() => handleExport("pdf")}
              onExportExcel={() => handleExport("excel")}
            />
            <button
              type="button"
              onClick={() => setIsStepsModalOpen(true)}
              className="flex items-center cursor-pointer gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-slate-400 active:scale-95"
            >
              Steps Details
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <DateRangeControl
            rangeType={rangeType}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onRangeTypeChange={setRangeType}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
          />
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            {dateRangeLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Abandoned Carts"
          value={stats.total}
          icon={<ShoppingCart size={20} />}
          color="rose"
        />
        <StatCard
          title="Total Cart Value"
          value={`₹ ${stats.totalValue.toLocaleString()}`}
          icon={<IndianRupee size={20} />}
          color="amber"
        />
        <StatCard
          title="Revenue Recovered"
          value={`₹ ${stats.recoveredRevenue.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color="emerald"
        />
        <StatCard
          title="Retention Rate"
          value={`${stats.retentionRate.toFixed(1)}%`}
          icon={<Clock size={20} />}
          color="slate"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#fb7185,#e11d48)",
                boxShadow: "0 0 8px rgba(225,29,72,0.4)",
              }}
            />
            <span className="text-xs font-black text-rose-600 uppercase tracking-widest">
              Needs Attention
            </span>
          </div>
          {!loading && (
            <span className="text-xs font-bold text-slate-400">
              {filteredCarts.length} cart{filteredCarts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!loading && !error && allCarts.length > 0 && (
          <div className="px-6 py-4">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {[
                { key: "all", label: "All" },
                { key: "abandoned", label: "Abandoned" },
                { key: "recovered", label: "Recovered" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-xl cursor-pointer px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                    statusFilter === item.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <p className="text-sm font-semibold text-slate-400">
              Loading carts…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm font-semibold text-rose-500">{error}</p>
            <button
              onClick={fetchData}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 hover:bg-indigo-100 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : allCarts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-400">
              No abandoned carts
            </p>
          </div>
        ) : filteredCarts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-400">
              No carts match this filter
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-100">
              <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</div>
              <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cart Value</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</div>
              <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</div>
            </div>

            {paginatedCarts.map((cart, idx) => (
              <CartRow
                key={`${cart.email}-${cart.cartId}`}
                cart={cart}
                index={(currentPage - 1) * limit + idx + 1}
                onOpen={() => setSelectedCart(cart)}
              />
            ))}
          </>
        )}

        {!loading && !error && filteredCarts.length > 0 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Rows
              </span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
              >
                {LIMIT_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-400">
              {(currentPage - 1) * limit + 1}-
              {Math.min(currentPage * limit, filteredCarts.length)} of{" "}
              {filteredCarts.length}
            </span>

            <div className="flex items-center gap-1">
              {getPaginationRange(currentPage, totalPages).map((page, i) =>
                page === "..." ? (
                  <span
                    key={`e-${i}`}
                    className="h-9 min-w-9 flex items-center justify-center text-xs font-black text-slate-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`h-9 min-w-9 cursor-pointer rounded-xl text-xs font-black transition-all ${
                      currentPage === page
                        ? "bg-slate-900 text-white shadow-lg"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <AbandonedCartDetailsModal
        cart={selectedCart}
        isOpen={Boolean(selectedCart)}
        onClose={() => setSelectedCart(null)}
      />
      <AbandonedCartStepsModal
        isOpen={isStepsModalOpen}
        onClose={() => setIsStepsModalOpen(false)}
        coupons={coupons}
      />
    </div>
  );
}

function CartRow({ cart, index, onOpen }) {
  return (
    <div className="grid w-full grid-cols-12 items-center border-b border-slate-50 px-6 py-4 text-left transition-colors hover:bg-slate-50/60">
      <div className="col-span-1">
        <span className="text-xs font-black text-slate-300">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="col-span-3 flex items-center gap-3 min-w-0">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            flexShrink: 0,
            background: "linear-gradient(135deg,#e0e7ff,#ede9fe)",
            border: "1px solid #e0e7ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 12,
            color: "#4f46e5",
          }}
        >
          {cart.initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">
            {cart.email}
          </p>
          <p className="text-xs text-slate-400 font-medium truncate">
            {cart.name}
          </p>
        </div>
      </div>

      <div className="col-span-1">
        <span className="text-xs font-bold text-slate-500">
          {cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="col-span-2">
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#e11d48",
            fontFamily: "monospace",
            background: "#fff1f2",
            border: "1px solid #ffe4e6",
            borderRadius: 7,
            padding: "3px 9px",
            whiteSpace: "nowrap",
          }}
        >
          Rs. {cart.cartValue.toFixed(2)}
        </span>
      </div>

      <div className="col-span-2">
        <StatusBadge status={cart.status} />
      </div>

      <div className="col-span-2">
        <span className="text-xs font-semibold text-slate-400">
          {cart.date}
        </span>
      </div>

      <div className="col-span-1">
        <button
          onClick={onOpen}
          className="text-xs font-semibold flex items-center justify-center cursor-pointer text-slate-400"
        >
          <Eye color="blue" className="h-5 w-auto" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    rose: "bg-rose-50 text-rose-500 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-lg border shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1.5 leading-none truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isRecovered = status === "recovered";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
        isRecovered
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {isRecovered ? "Recovered" : "Abandoned"}
    </span>
  );
}
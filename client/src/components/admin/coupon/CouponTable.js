"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import CouponModal from "./CouponModal";
import ViewCouponDrawer from "./ViewCouponDrawer";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

import { getCoupons, deleteCoupon } from "@/services/couponService";

const getCouponStatus = (coupon) => {
  const isExpired = coupon?.endDate
    ? new Date(coupon.endDate).getTime() < Date.now()
    : false;

  if (isExpired) return "Expired";
  return coupon?.isActive ? "Live" : "Paused";
};

export default function CouponTable({ refreshStats }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewCoupon, setViewCoupon] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async (isRefresh = false) => {
    setLoading(true);
    try {
      const res = await getCoupons(1, 100, "");
      if (res.success) {
        setCoupons(res.data);
        if (refreshStats) refreshStats();
        if (isRefresh) toast.success("Data synchronized!");
      }
    } catch (err) {
      toast.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const loadingToast = toast.loading("Deleting coupon...");
    try {
      const res = await deleteCoupon(deleteId);
      if (res) {
        fetchCoupons();
        toast.success("Coupon deleted successfully", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Failed to delete", { id: loadingToast });
    } finally {
      setDeleteId(null);
      setShowDeleteModal(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredData = useMemo(() => {
    return coupons
      .filter((c) => {
        const searchMatch =
          c.code?.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase());

        const currentStatus = getCouponStatus(c);
        const statusMatch =
          statusFilter === "All" || currentStatus === statusFilter;

        return searchMatch && statusMatch;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [coupons, search, statusFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, rowsPerPage]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 flex flex-wrap justify-between items-center gap-4 border-b border-slate-100">
        <div className="flex gap-3 flex-1 items-center min-w-[300px]">
          <div className="relative max-w-md w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-200 outline-none"
              placeholder="Search coupons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Live">Live</option>
            <option value="Expired">Expired</option>
          </select>

          <button
            onClick={() => fetchCoupons(true)}
            disabled={loading}
            className="p-2 text-slate-500 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
          className="bg-slate-900 cursor-pointer hover:bg-black text-white px-5 py-2 rounded text-sm font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          + Add Coupon
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="px-4 py-4 w-12 text-center">#</th>
              <th
                className="px-4 py-4 cursor-pointer group"
                onClick={() => handleSort("code")}
              >
                <div className="flex items-center gap-1">
                  Campaign / Code{" "}
                  <ArrowUpDown
                    size={14}
                    className="opacity-50 group-hover:opacity-100"
                  />
                </div>
              </th>
              <th className="px-4 py-4">Offer Details</th>
              <th className="px-4 py-4">Usage Progress</th>
              <th className="px-4 py-4">Expiry</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((c, i) => (
                <tr
                  key={c._id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-4 text-slate-400 font-medium text-center text-xs">
                    {(currentPage - 1) * rowsPerPage + i + 1}
                  </td>

                  {/* Code Logic: Handle Festive Sale */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded ${c.couponType === "FestiveSale" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}
                      >
                        {c.couponType === "FestiveSale" ? (
                          <Zap size={14} />
                        ) : (
                          <Ticket size={14} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {c.code || "AUTO-APPLIED"}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">
                          {c.couponType}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Offer Logic: Handle BOGO & Values */}
                  <td className="px-4 py-4 text-slate-600 font-medium">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">
                        {c.offerType === "Percentage" && `${c.offerValue}% OFF`}
                        {c.offerType === "FixedAmount" &&
                          `₹${c.offerValue} OFF`}
                        {c.offerType === "BOGO" &&
                          `Buy ${c.buyQuantity} Get ${c.getQuantity}`}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Min: ₹{c.minOrderAmount || 0}
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold mt-1">
                        Scope:{" "}
                        {c.scope === "All"
                          ? "All Products"
                          : c.scope === "Category"
                            ? `Category (${c.applicableIds?.length || 0})`
                            : `Specific Products (${c.applicableIds?.length || 0})`}
                      </span>
                    </div>
                  </td>

                  {/* Usage Progress */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        {c.usedCount} / {c.totalUsageLimit} Used
                      </span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full ${c.usedCount / c.totalUsageLimit > 0.8 ? "bg-rose-500" : "bg-slate-900"}`}
                          style={{
                            width: `${Math.min((c.usedCount / (c.totalUsageLimit || 1)) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-600 text-xs font-bold">
                        {new Date(c.endDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.endDate).getFullYear()}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        getCouponStatus(c) === "Live"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : getCouponStatus(c) === "Expired"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {getCouponStatus(c)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-3 text-slate-400">
                      <button
                        title="View"
                        className="hover:text-slate-900 transition-colors p-1 cursor-pointer"
                        onClick={() => {
                          setViewCoupon(c);
                          setShowDrawer(true);
                        }}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        title="Edit"
                        className="hover:text-blue-600 transition-colors p-1 cursor-pointer"
                        onClick={() => {
                          setEditData(c);
                          setShowModal(true);
                        }}
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        title="Delete"
                        className="hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        onClick={() => {
                          setDeleteId(c._id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-20 text-center text-slate-500 font-medium italic"
                >
                  {loading ? "Syncing data..." : "No coupons found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination: Same as your original logic */}
      <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Rows per page
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1 px-2 rounded-md outline-none cursor-pointer"
          >
            {[5, 10, 20, 50].map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="text-[11px] font-medium text-slate-500">
            {filteredData.length > 0 && (
              <>
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, filteredData.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {filteredData.length}
                </span>{" "}
                results
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <ChevronLeft size={16} className="text-slate-600" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${currentPage === page ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300"}`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <CouponModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchCoupons}
        initialData={editData}
        allCoupons={coupons} // ← add this
      />
      <ViewCouponDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        coupon={viewCoupon}
      />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        entityName="coupon"
        itemName={coupons.find((c) => c._id === deleteId)?.code}
      />
    </div>
  );
}

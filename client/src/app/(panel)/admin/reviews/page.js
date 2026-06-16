"use client";
import { useState, useEffect } from "react";
import { Star, ThumbsUp, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/admin/layout/PageHeader.js";
import {
  getAdminReviews,
  updateReviewStatusAdmin,
  deleteReviewAdmin,
} from "@/services/productService";
import toast from "react-hot-toast";
import ReviewModal from "@/components/admin/reviews/ReviewModal";
import ReviewTable from "@/components/admin/reviews/ReviewTable";
import {
  StatCard,
  FilterTab,
  StarRow,
} from "@/components/admin/reviews/ReviewShared";

const PAGE_SIZE = 50;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, approved: 0, pending: 0 });
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    comment: "",
    rating: 5,
    userName: "",
  });

  // Stats fetched once independently — not derived from current page slice
  useEffect(() => {
    fetchStats();
  }, []);

  // Reviews refetch whenever filter or page changes
  useEffect(() => {
    fetchReviews();
  }, [filter, page]);

  const fetchStats = async () => {
    try {
      const res = await getAdminReviews(1, 1, "all");
      if (res.success) {
        const meta = res.meta || res;
        setStats({
          average: meta.averageRating ?? 0,
          approved: meta.approvedCount ?? 0,
          pending: meta.pendingCount ?? 0,
        });
      }
    } catch {
      toast.error("Failed to fetch review stats");
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await getAdminReviews(page, PAGE_SIZE, filter);
      if (res.success) {
        setReviews(res.data || []);
        setTotalCount(res.meta?.total ?? res.total ?? 0);
      }
    } catch {
      toast.error("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  // Filter change — reset to page 1
  const handleFilterChange = (val) => {
    setFilter(val);
    setPage(1);
  };

  // Modal handlers
  const openEdit = (review) => {
    setEditingId(review._id);
    setEditForm({
      comment: review.comment,
      rating: review.rating,
      userName: review.userName,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm({ comment: "", rating: 5, userName: "" });
  };

  const handleFormChange = (field, value) =>
    setEditForm((p) => ({ ...p, [field]: value }));

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateReviewStatusAdmin(editingId, editForm);
      if (res.success) {
        toast.success("Review updated");
        fetchReviews();
        fetchStats();
        closeEdit();
      } else toast.error(res.message || "Failed to update");
    } catch {
      toast.error("Error updating review");
    }
  };

  const handleStatus = async (id, isApproved) => {
    try {
      const res = await updateReviewStatusAdmin(id, { isApproved });
      if (res.success) {
        toast.success(`Review ${isApproved ? "approved" : "rejected"}`);
        fetchReviews();
        fetchStats(); // keep stat cards in sync after status change
      } else toast.error(res.message || "Failed to update status");
    } catch {
      toast.error("Error updating status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await deleteReviewAdmin(id);
      if (res.success) {
        toast.success("Review deleted");
        fetchReviews();
        fetchStats(); // keep stat cards in sync after delete
      } else toast.error(res.message || "Failed to delete");
    } catch {
      toast.error("Error deleting review");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Customer Reviews"
        subtitle="Monitor and moderate product feedback"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 mb-6">
        <StatCard
          icon={<Star size={18} />}
          label="Average Rating"
          value={stats.average}
          color="#f59e0b"
          subtext={<StarRow rating={Math.round(stats.average)} />}
        />
        <StatCard
          icon={<ThumbsUp size={18} />}
          label="Approved"
          value={stats.approved}
          color="#10b981"
          subtext={
            <p className="text-xs text-slate-400">
              {(stats.approved + stats.pending) > 0
                ? Math.round((stats.approved / (stats.approved + stats.pending)) * 100)
                : 0}
              % of total
            </p>
          }
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="Awaiting Review"
          value={stats.pending}
          color="#f97316"
          subtext={
            <p className="text-xs text-slate-400">
              {stats.pending > 0 ? "Action required" : "All caught up!"}
            </p>
          }
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 w-fit mb-5 border border-slate-100">
        <FilterTab
          label="All"
          active={filter === "all"}
          count={stats.approved + stats.pending}
          onClick={() => handleFilterChange("all")}
        />
        <FilterTab
          label="Approved"
          active={filter === "approved"}
          count={stats.approved}
          onClick={() => handleFilterChange("approved")}
        />
        <FilterTab
          label="Pending"
          active={filter === "pending"}
          count={stats.pending}
          onClick={() => handleFilterChange("pending")}
        />
      </div>

      {/* Table — reviews already filtered server-side, no client-side .filter() */}
      <ReviewTable
        reviews={reviews}
        loading={loading}
        total={totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onEdit={openEdit}
        onStatus={handleStatus}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 px-1">
          <p className="text-xs text-slate-400 font-medium">
            Showing{" "}
            <span className="text-slate-700 font-bold">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, totalCount)}
            </span>{" "}
            of <span className="text-slate-700 font-bold">{totalCount}</span> reviews
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-300 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === item
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ReviewModal
        isOpen={!!editingId}
        editForm={editForm}
        onChange={handleFormChange}
        onSubmit={handleEditSubmit}
        onClose={closeEdit}
      />
    </div>
  );
}

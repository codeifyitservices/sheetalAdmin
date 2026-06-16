"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import AddUserModal from "./AddCustomerModal";
import ViewUserDrawer from "./ViewCustomerDrawer";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

import {
  getUsers,
  addUser,
  deleteUser,
  updateUser,
} from "@/services/userService";

export default function CustomerTable({
  dateRange,
  refreshStats,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState(null); // New state for selected user name
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    setLoading(true);
    try {
      const res = await getUsers(
        1,
        1000,
        "",
        dateRange?.startDate || "",
        dateRange?.endDate || "",
      );
      if (res.success) {
        setUsers(res.data);
        if (refreshStats) refreshStats();
        if (isRefresh) toast.success("Data synchronized!");
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [dateRange?.endDate, dateRange?.startDate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async (payload) => {
    const loadingToast = toast.loading(
      editUser ? "Updating user..." : "Adding user...",
    );
    try {
      if (editUser) {
        const res = await updateUser(editUser._id, payload);
        if (res.success) {
          fetchUsers();
          toast.success("User updated successfully!", { id: loadingToast });
        }
      } else {
        const res = await addUser(payload);
        if (res.success) {
          fetchUsers();
          toast.success("User added successfully!", { id: loadingToast });
        }
      }
      setShowModal(false);
      setEditUser(null);
    } catch (err) {
      toast.error(err.message || "Operation failed", { id: loadingToast });
    }
  };

  const confirmDeleteUser = async () => {
    const loadingToast = toast.loading("Deleting user...");
    try {
      await deleteUser(deleteUserId);
      fetchUsers();
      toast.success("User deleted successfully", { id: loadingToast });
    } catch (err) {
      toast.error("Failed to delete user", { id: loadingToast });
    } finally {
      setDeleteUserId(null);
      setSelectedUserName(null); // Clear selected user name
      setShowDeleteModal(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const searchMatch =
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.phoneNumber?.includes(search);
        const statusMatch = statusFilter === "All" || u.status === statusFilter;
        return searchMatch && statusMatch;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, search, statusFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, rowsPerPage]);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 flex justify-between items-center gap-4 border-b border-slate-100">
        <div className="flex gap-3 flex-1 items-center">
          <div className="relative max-w-md w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:ring-2 focus:ring-slate-200 outline-none"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none cursor-pointer hover:border-slate-400 transition-colors"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button
            onClick={() => fetchUsers(true)}
            disabled={loading}
            className="p-2 text-slate-500 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          onClick={() => {
            setEditUser(null);
            setShowModal(true);
          }}
          className="bg-slate-900 cursor-pointer hover:bg-black text-white px-5 py-2 rounded text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          + Add User
        </button>
      </div>

      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="px-4 py-4">#</th>
              <th className="px-4 py-4">Name</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Phone</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Joined At</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((u, i) => (
                <tr
                  key={u._id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-4 text-slate-500 font-medium">
                    {(currentPage - 1) * rowsPerPage + i + 1}
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {u.name}
                  </td>
                  <td className="px-4 py-4 text-slate-600 font-medium">
                    {u.email}
                  </td>
                  <td className="px-4 py-4 text-slate-600 font-medium">
                    {u.phoneNumber || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 font-medium">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-4 text-slate-400">
                      <Link
                        href={`/admin/customers/${u._id}`}
                        title="View Full Profile"
                        className=" hover:text-slate-900 transition-colors cursor-pointer" 
                      >
                        <UserCircle size={18} />
                      </Link>
                      <button
                        title="View"
                        className="hover:text-slate-900 transition-colors cursor-pointer"
                        onClick={() => {
                          setViewUser(u);
                          setShowDrawer(true);
                        }}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        title="Edit"
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                        onClick={() => {
                          setEditUser(u);
                          setShowModal(true);
                        }}
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        title="Delete"
                        className="hover:text-rose-600 transition-colors cursor-pointer"
                        onClick={() => {
                          setDeleteUserId(u._id);
                          setSelectedUserName(u.name);
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
                  colSpan="6"
                  className="px-4 py-20 text-center text-slate-500 font-medium italic"
                >
                  {loading
                    ? "Syncing data..."
                    : "No users found matching your criteria."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Rows per page
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1 px-2 rounded-md outline-none cursor-pointer focus:border-slate-400 transition-colors"
            >
              {[5, 10, 20, 50].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="text-[11px] font-medium text-slate-500">
            {filteredUsers.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, filteredUsers.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {filteredUsers.length}
                </span>{" "}
                results
              </>
            ) : (
              "No results found"
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} className="text-slate-600 " />
            </button>

            <div className="flex items-center gap-1">
              {Array.from(
                { length: Math.ceil(filteredUsers.length / rowsPerPage) },
                (_, i) => i + 1,
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${
                    currentPage === page
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              disabled={
                currentPage >= Math.ceil(filteredUsers.length / rowsPerPage)
              }
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <AddUserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAddUser={handleAddUser}
        editUser={editUser}
      />
      <ViewUserDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        user={viewUser}
      />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteUser}
        entityName="user"
        itemName={selectedUserName}
      />
    </div>
  );
}

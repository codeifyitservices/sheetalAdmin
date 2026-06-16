"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Eye,
  Edit3,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Truck,
  Hash,
  ExternalLink,
  Tag,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import OrderModal from "./OrderModal";
import ViewOrderDrawer from "./ViewOrderDrawer";
import CreateOrderModal from "./CreateOrderModal";
import { getAllOrders, assignAwb } from "@/services/orderService";

export default function OrderTable({
  dateRange,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [awbLoading, setAwbLoading] = useState(null); // stores orderId currently being assigned

  const fetchOrders = useCallback(async (isRefresh = false) => {
    setLoading(true);
    try {
      const res = await getAllOrders(
        1,
        1000,
        "",
        dateRange?.startDate || "",
        dateRange?.endDate || "",
      );
      if (res.success) {
        setOrders(res.data.orders);
        if (isRefresh) toast.success("Orders synchronized");
      }
    } catch (err) {
      toast.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [dateRange?.endDate, dateRange?.startDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAssignAwb = async (orderId) => {
    setAwbLoading(orderId);
    try {
      const res = await assignAwb(orderId);
      if (res.success) {
        toast.success(`AWB assigned: ${res.data.awbCode}`);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.message || "AWB assignment failed");
    } finally {
      setAwbLoading(null);
    }
  };

  const filteredData = useMemo(() => {
    return orders
      .filter((o) => {
        const customerMatch = o.shippingAddress?.fullName
          ?.toLowerCase()
          .includes(search.toLowerCase());
        const idMatch = o._id.toLowerCase().includes(search.toLowerCase());
        const statusMatch =
          statusFilter === "All" || o.orderStatus === statusFilter;
        return (customerMatch || idMatch) && statusMatch;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        return sortConfig.direction === "asc"
          ? aVal > bVal
            ? 1
            : -1
          : aVal < bVal
            ? 1
            : -1;
      });
  }, [orders, search, statusFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Processing":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "Shipped":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Cancelled":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const exportRows = filteredData.map((order) => ({
    id: order._id,
    customer: order.shippingAddress?.fullName || "-",
    items: order.orderItems?.length || 0,
    amount: order.totalPrice != null ? `₹${Number(order.totalPrice).toLocaleString("en-IN")}` : "-",
    status: order.orderStatus || "-",
    paymentMethod: order.paymentInfo?.method || "-",
    awbCode: order.awbCode || "-",
    shiprocketOrderId: order.shiprocketOrderId || "-",
    date: order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-IN")
      : "-",
  }));

  const handleDownloadPdf = async () => {
    await downloadPdfReport({
      filename: `orders_report_${new Date().toISOString().split("T")[0]}`,
      title: "Orders Report",
      meta: [
        `Total Orders: ${exportRows.length}`,
        `Generated on: ${new Date().toLocaleString()}`,
      ],
      columns: exportColumns,
      rows: exportRows,
    });
  };

  const handleDownloadExcel = async () => {
    downloadCsvReport({
      filename: `orders_report_${new Date().toISOString().split("T")[0]}`,
      columns: exportColumns,
      rows: exportRows,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900 overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-5 flex flex-wrap justify-between items-center gap-4 bg-white">
        <div className="flex flex-wrap gap-3 flex-1 items-center">
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all"
              placeholder="Search ID or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 outline-none cursor-pointer hover:bg-white transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => fetchOrders(true)}
            disabled={loading}
            className="p-2.5 text-slate-400 cursor-pointer hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 cursor-pointer   hover:bg-black text-white px-6 py-2.5 rounded-xl text-sm font-black tracking-tight transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center gap-2"
        >
          <Plus size={18} /> Add Manual Order
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-y border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Info
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Order Details
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Amount
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Shiprocket
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                AWB
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedData.length > 0 ? (
              paginatedData.map((o, i) => (
                <tr
                  key={o._id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-inner ${o.orderStatus === "Shipped"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-white"
                          }`}
                      >
                        {o.orderStatus === "Shipped" ? (
                          <Truck size={14} />
                        ) : (
                          <Package size={14} />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 leading-none flex items-center gap-1.5 uppercase tracking-tight">
                      {o._id}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium italic">
                      {o.shippingAddress?.fullName} • {o.orderItems?.length}{" "}
                      items
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="font-black text-slate-900 tracking-tight">
                      ₹{o.totalPrice?.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      {o.paymentInfo?.method}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(o.orderStatus)}`}
                    >
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {o.shiprocketOrderId ? (
                      <a
                        href={`https://app.shiprocket.in/seller/orders/details/${o.shiprocketOrderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`View on Shiprocket (ID: ${o.shiprocketOrderId})`}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 hover:bg-teal-100 hover:border-teal-400 transition-all text-[10px] font-black uppercase tracking-wide"
                      >
                        <ExternalLink size={11} />
                        SR
                      </a>
                    ) : (
                      <span className="text-slate-300 text-xs font-bold">—</span>
                    )}
                  </td>
                  {/* AWB Column */}
                  <td className="px-6 py-4 text-center">
                    {o.awbCode ? (
                      // AWB already assigned — show the code as a static green pill
                      <span
                        title={`Courier: ${o.courierPartner || "—"}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wide"
                      >
                        <Tag size={10} />
                        {o.awbCode}
                      </span>
                    ) : o.shipmentId ? (
                      // Has shipmentId but no AWB yet — show the Assign button
                      <button
                        onClick={() => handleAssignAwb(o._id)}
                        disabled={awbLoading === o._id}
                        title="Assign AWB via Shiprocket"
                        className="inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-all text-[10px] font-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-wait"
                      >
                        {awbLoading === o._id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Truck size={11} />
                        )}
                        {awbLoading === o._id ? "Assigning..." : "Assign AWB"}
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs font-bold">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setViewOrder(o);
                          setShowDrawer(true);
                        }}
                        className="p-2 cursor-pointer hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-900 transition-all"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditData(o);
                          setShowStatusModal(true);
                        }}
                        className="p-2 cursor-pointer hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-blue-600 transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-4 py-32 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 italic">
                    <Package size={40} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">No orders found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Rows
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
          >
            {[10, 25, 50].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="text-[11px] font-medium text-slate-500 tracking-tight">
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
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 border border-slate-200 cursor-pointer rounded-xl bg-white disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-9 min-w-[36px] cursor-pointer rounded-xl text-xs font-black transition-all ${currentPage === i + 1
                    ? "bg-slate-900 text-white shadow-lg"
                    : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 border cursor-pointer border-slate-200 rounded-xl bg-white disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchOrders}
      />
      <OrderModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSuccess={(updatedOrder) => {
          if (updatedOrder) {
            setOrders((currentOrders) =>
              currentOrders.map((order) =>
                order._id === updatedOrder._id ? updatedOrder : order,
              ),
            );
            setEditData(updatedOrder);
          }
          fetchOrders();
        }}
        initialData={editData}
      />
      <ViewOrderDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        order={viewOrder}
        onOrderUpdated={(updatedOrder) => {
          setViewOrder(updatedOrder);
          setOrders((currentOrders) =>
            currentOrders.map((order) =>
              order._id === updatedOrder._id ? updatedOrder : order,
            ),
          );
        }}
      />
    </div>
  );
}

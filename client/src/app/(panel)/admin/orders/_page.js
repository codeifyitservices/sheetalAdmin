"use client";
import { useState } from "react";
import {
  Search,
  Filter,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import PageHeader from "@/components/admin/layout/PageHeader.js";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

export default function OrdersPage() {
  const scrollStyle = "overflow-x-auto custom-scrollbar";
  const [isExporting, setIsExporting] = useState(false);

  // Dummy Orders Data
  const orders = [
    {
      id: "#ORD-7721",
      customer: "Rahul Verma",
      date: "28 Dec, 2025",
      total: "₹2,499",
      status: "Delivered",
      method: "UPI",
    },
    {
      id: "#ORD-7722",
      customer: "Sneha Kapoor",
      date: "27 Dec, 2025",
      total: "₹1,250",
      status: "Processing",
      method: "COD",
    },
    {
      id: "#ORD-7723",
      customer: "Amit Singh",
      date: "27 Dec, 2025",
      total: "₹8,990",
      status: "Shipped",
      method: "Card",
    },
    {
      id: "#ORD-7724",
      customer: "Priya Das",
      date: "26 Dec, 2025",
      total: "₹3,200",
      status: "Pending",
      method: "UPI",
    },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Processing":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "Shipped":
        return "bg-orange-50 text-orange-600 border-orange-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const exportColumns = [
    { key: "id", label: "Order ID" },
    { key: "customer", label: "Customer" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
    { key: "total", label: "Total" },
    { key: "method", label: "Method" },
  ];

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const filename = `orders_mock_${new Date().toISOString().split("T")[0]}`;
      if (format === "pdf") {
        await downloadPdfReport({
          filename,
          title: "Orders Report",
          meta: [`Generated on: ${new Date().toLocaleString()}`],
          columns: exportColumns,
          rows: orders,
        });
        return;
      }

      downloadCsvReport({
        filename,
        columns: exportColumns,
        rows: orders,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Orders Management"
        subtitle="Track and manage customer shipments"
        action={
          <ReportExportMenu
            busy={isExporting}
            onExportPdf={() => handleExport("pdf")}
            onExportExcel={() => handleExport("excel")}
            label="Export Report"
          />
        }
      />

      {/* --- Filters & Search Bar --- */}
      <div className="bg-white p-4 md:p-6 rounded-[24px] border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 transition-all font-medium"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Filter size={16} /> Filters
            </button>
            <ReportExportMenu
              busy={isExporting}
              onExportPdf={() => handleExport("pdf")}
              onExportExcel={() => handleExport("excel")}
              label="Download"
            />
          </div>
        </div>
      </div>

      {/* --- Orders Table --- */}
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
        <div className={scrollStyle}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Order ID
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Customer
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Date
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-slate-900">
                      {order.id}
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                      {order.method}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-800">
                      {order.customer}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-slate-500">
                      {order.date}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border ${getStatusStyle(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-900 font-mono">
                      {order.total}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="p-6 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Showing 4 of 120 orders
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-400 cursor-not-allowed">
              Prev
            </button>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-900 hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

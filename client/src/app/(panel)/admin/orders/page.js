"use client";

import { useMemo, useState, useEffect } from "react";
import OrderTable from "@/components/admin/order/OrderTable";
import PageHeader from "@/components/admin/layout/PageHeader";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import {
  ShoppingBag,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { getAllOrders, getOrderStats } from "@/services/orderService";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";
import DateRangeControl from "@/components/admin/common/DateRangeControl";
import { useDateRange } from "@/hooks/useDateRange";

const PERIODS = [
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
  { key: "yearly", label: "Year" },
];

export default function OrdersPage() {
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
  const [ordersForExport, setOrdersForExport] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getOrderStats(dateRange.startDate, dateRange.endDate);
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error("Error fetching order stats:", err);
      }
    };

    fetchStats();
  }, [dateRange.endDate, dateRange.startDate]);

  useEffect(() => {
    const fetchOrdersForExport = async () => {
      try {
        const res = await getAllOrders(
          1,
          1000,
          "",
          dateRange.startDate,
          dateRange.endDate,
        );
        if (res.success) {
          setOrdersForExport(res.data.orders || []);
        }
      } catch (err) {
        console.error("Error fetching orders for export:", err);
      }
    };

    fetchOrdersForExport();
  }, [dateRange.endDate, dateRange.startDate]);

  const exportColumns = [
    { key: "id", label: "Order ID" },
    { key: "customer", label: "Customer" },
    { key: "items", label: "Items" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "awbCode", label: "AWB Code" },
    { key: "shiprocketOrderId", label: "Shiprocket Order ID" },
    { key: "date", label: "Date" },
  ];

  const exportRows = ordersForExport.map((order) => ({
    id: order._id,
    customer: order.shippingAddress?.fullName || "-",
    items: order.orderItems?.length || 0,
    amount:
      order.totalPrice != null
        ? `Rs. ${Number(order.totalPrice).toLocaleString("en-IN")}`
        : "-",
    status: order.orderStatus || "-",
    paymentMethod: order.paymentInfo?.method || "-",
    awbCode: order.awbCode || "-",
    shiprocketOrderId: order.shiprocketOrderId || "-",
    date: order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-IN")
      : "-",
  }));

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
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
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      downloadCsvReport({
        filename: `orders_report_${new Date().toISOString().split("T")[0]}`,
        columns: exportColumns,
        rows: exportRows,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Order Management"
        subtitle="Track, manage and update customer orders and shipping status"
        action={
          <ReportExportMenu
            busy={isExporting}
            disabled={isExporting || exportRows.length === 0}
            onExportPdf={handleDownloadPdf}
            onExportExcel={handleDownloadExcel}
          />
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          count={stats.totalRevenue}
          icon={<IndianRupee size={20} />}
          color="indigo"
          isCurrency={true}
        />
        <StatCard
          title="Processing"
          count={stats.processing}
          icon={<Clock size={20} />}
          color="amber"
        />
        <StatCard
          title="In Transit"
          count={stats.shipped}
          icon={<Truck size={20} />}
          color="blue"
        />
        <StatCard
          title="Delivered"
          count={stats.delivered}
          icon={<CheckCircle size={20} />}
          color="emerald"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <OrderTable
          dateRange={dateRange}
          onDateRangeChange={() => {}}
        />
      </div>
    </div>
  );
}

function StatCard({ title, count, icon, color, isCurrency = false }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-lg border ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1.5 leading-none">
          {isCurrency ? `₹${count.toLocaleString()}` : count.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

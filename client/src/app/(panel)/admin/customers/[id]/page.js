"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Trash2,
  Edit,
  ShoppingBag,
  Wallet,
  UserX,
} from "lucide-react";
import { getUserById, deleteUser, updateUser } from "@/services/userService";
import PageHeader from "@/components/admin/layout/PageHeader";
import toast from "react-hot-toast";

import AddUserModal from "@/components/admin/customer/AddCustomerModal";
import DeleteConfirmModal from "@/components/admin/common/DeleteConfirmModal";
import ViewOrderDrawer from "@/components/admin/order/ViewOrderDrawer";
import AddressModal from "@/components/admin/customer/AddressModal";

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressIndex, setAddressIndex] = useState(null);

  const fetchFullDetails = async () => {
    setLoading(true);
    try {
      const res = await getUserById(id);
      if (res.success) setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullDetails();
  }, [id]);

  const handleUpdateUser = async (payload) => {
    const loadingToast = toast.loading("Updating user...");
    try {
      const res = await updateUser(id, payload);
      if (res.success) {
        toast.success("Profile updated!", { id: loadingToast });
        fetchFullDetails();
        setShowEditModal(false);
      }
    } catch (err) {
      toast.error("Update failed", { id: loadingToast });
    }
  };

  const handleDeleteConfirm = async () => {
    const loadingToast = toast.loading("Deleting customer...");
    try {
      const res = await deleteUser(id);
      if (res.success) {
        toast.success("User deleted", { id: loadingToast });
        router.push("/admin/customers");
      }
    } catch (err) {
      toast.error("Delete failed", { id: loadingToast });
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleSaveAddress = async (addressData) => {
    const newAddresses = [...(user.addresses || [])];
    if (addressIndex !== null) {
      newAddresses[addressIndex] = addressData;
    } else {
      newAddresses.push(addressData);
    }
    await handleUpdateUser({ addresses: newAddresses });
  };

  const handleRemoveAddress = async (index) => {
    if (!window.confirm("Are you sure you want to remove this address?")) return;
    const newAddresses = user.addresses.filter((_, i) => i !== index);
    await handleUpdateUser({ addresses: newAddresses });
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  if (loading)
    return <div className="animate-pulse p-20 text-center">Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title={user.name}
          subtitle={`Customer ID: ${user._id.toUpperCase()}`}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white cursor-pointer border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-white border cursor-pointer border-slate-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Edit size={14} /> Edit
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-rose-50 border cursor-pointer border-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Spent"
          count={`₹${(user.totalSpent || 0).toLocaleString()}`}
          icon={<Wallet size={20} />}
          color="indigo"
        />
        <StatCard
          title="Orders"
          count={user.orders?.length || 0}
          icon={<ShoppingBag size={20} />}
          color="emerald"
        />
        <StatCard
          title="Status"
          count={user.status}
          icon={<Calendar size={20} />}
          color="slate"
        />
        <StatCard
          title="Phone"
          count={user.phoneNumber || "N/A"}
          icon={<Phone size={20} />}
          color="amber"
          valueClassName="text-lg truncate"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-10">
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          {["overview", "orders", "addresses"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 cursor-pointer text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === tab ? "text-slate-900 bg-white" : "text-slate-400 hover:text-slate-600"}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />
              )}
            </button>
          ))}
        </div>
        <div className="p-6 min-h-[400px]">
          {activeTab === "overview" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Profile & Quick Actions */}
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-indigo-100">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">
                      {user.name}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                      {user.role || "Customer"}
                    </p>

                    <div className="mt-6 w-full space-y-2">
                      <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                          Status
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${user.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                        >
                          {user.status}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 leading-tight mt-2">
                      {user.name}
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                      {user.role || "Verified Customer"}
                    </p>
                  </div>
                </div>

                {/* Column 2 & 3: Detailed Info & Insights */}
                <div className="md:col-span-2 space-y-6">
                  {/* Account Details Box */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                        Primary Information
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                        ID: {user._id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <InfoItem label="Full Name" value={user.name} />
                      <InfoItem label="Email Address" value={user.email} />
                      <InfoItem
                        label="Phone Number"
                        value={user.phoneNumber || "Not Linked"}
                      />
                      <InfoItem
                        label="Registration Date"
                        value={new Date(user.createdAt).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" },
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full" />
                      System Activity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <InfoItem
                        label="Customer Since"
                        value={new Date(user.createdAt).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      />
                      <InfoItem
                        label="Last Profile Update"
                        value={new Date(user.updatedAt).toLocaleString()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  Order History
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  Total: {user.orders?.length || 0} Orders
                </span>
              </div>

              {user.orders?.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {user.orders.map((order) => (
                    <div
                      key={order._id}
                      onClick={() => handleOrderClick(order)}
                      className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-500 transition-all flex flex-wrap md:flex-nowrap items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center group-hover:bg-indigo-50 transition-colors">
                          <ShoppingBag
                            size={18}
                            className="text-slate-400 group-hover:text-indigo-600"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            Order #{order.orderId}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            Placed on{" "}
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                            Status
                          </p>
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${order.status === "Delivered"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                              }`}
                          >
                            {order.status || "Processing"}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                            Total Amount
                          </p>
                          <p className="text-sm font-black text-slate-900 italic">
                            ₹{(order.totalPrice ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <ArrowLeft
                            size={16}
                            className="rotate-180 text-slate-400"
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <ShoppingBag
                    size={40}
                    className="mx-auto text-slate-300 mb-4"
                  />
                  <p className="text-xs font-black text-slate-400 uppercase">
                    No orders found for this user
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  Saved Addresses
                </h3>
                <button
                  onClick={() => {
                    setSelectedAddress(null);
                    setAddressIndex(null);
                    setIsAddressModalOpen(true);
                  }}
                  className="text-[10px] font-black text-indigo-600 uppercase border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer"
                >
                  + Add New Address
                </button>
              </div>

              {user.addresses?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.addresses.map((addr, idx) => (
                    <div
                      key={idx}
                      className="relative p-6 border border-slate-200 rounded-3xl bg-white hover:shadow-xl hover:shadow-slate-100 hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <MapPin size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">
                          {addr.type || "Default"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                          {addr.firstName} {addr.lastName}
                          <span className="text-slate-300 font-normal">|</span>
                          <span className="text-slate-500">{addr.phoneNumber}</span>
                        </p>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          {addr.addressLine1}
                        </p>
                        <p className="text-xs font-bold text-slate-500 italic">
                          {addr.city}, {addr.state} — {addr.postalCode}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-50 flex gap-4">
                        <button
                          onClick={() => {
                            setSelectedAddress(addr);
                            setAddressIndex(idx);
                            setIsAddressModalOpen(true);
                          }}
                          className="text-[10px] font-black text-slate-400 uppercase hover:text-indigo-600 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveAddress(idx)}
                          className="text-[10px] font-black text-slate-400 uppercase hover:text-rose-600 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <MapPin size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    No address found
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddUserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onAddUser={handleUpdateUser}
        editUser={user}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      <ViewOrderDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        order={selectedOrder}
      />

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setSelectedAddress(null);
          setAddressIndex(null);
        }}
        onSave={handleSaveAddress}
        editAddress={selectedAddress}
      />
    </div>
  );
}

function StatCard({ title, count, icon, color, valueClassName = "" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-all duration-300">
      <div className={`p-3 rounded-lg border ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p
          className={`text-2xl font-black text-slate-900 mt-1.5 leading-none ${valueClassName}`}
        >
          {typeof count === "number" ? count.toLocaleString() : count}
        </p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-700">{value || "N/A"}</p>
    </div>
  );
}

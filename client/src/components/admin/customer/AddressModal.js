"use client";
import { useState, useEffect } from "react";
import { X, MapPin } from "lucide-react";

export default function AddressModal({ isOpen, onClose, onSave, editAddress }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    addressType: "Home",
    isDefault: false,
  });

  useEffect(() => {
    if (isOpen) {
      if (editAddress) {
        setForm({
          firstName: editAddress.firstName || "",
          lastName: editAddress.lastName || "",
          phoneNumber: editAddress.phoneNumber || "",
          addressLine1: editAddress.addressLine1 || "",
          city: editAddress.city || "",
          state: editAddress.state || "",
          postalCode: editAddress.postalCode || "",
          country: editAddress.country || "India",
          addressType: editAddress.addressType || "Home",
          isDefault: editAddress.isDefault || false,
        });
      } else {
        setForm({
          firstName: "",
          lastName: "",
          phoneNumber: "",
          addressLine1: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
          addressType: "Home",
          isDefault: false,
        });
      }
    }
  }, [isOpen, editAddress]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {editAddress ? "Edit Address" : "Add New Address"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {editAddress ? "Update saved location details" : "Register a new shipping destination"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 cursor-pointer hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                First Name
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Last Name
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Phone Number
            </label>
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Address Line
            </label>
            <input
              name="addressLine1"
              value={form.addressLine1}
              onChange={handleChange}
              placeholder="House No, Building, Street..."
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                City
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                State
              </label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Postal Code
              </label>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Address Type
              </label>
              <select
                name="addressType"
                value={form.addressType}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition appearance-none cursor-pointer"
              >
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
             <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                    <input 
                        type="checkbox" 
                        name="isDefault"
                        checked={form.isDefault}
                        onChange={handleChange}
                        className="peer sr-only"
                    />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 shadow-inner"></div>
                </div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Set as default address</span>
             </label>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
            >
              {editAddress ? "Update Address" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

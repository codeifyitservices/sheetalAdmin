"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Save,
  BadgeIndianRupee,
  Truck,
  ReceiptText,
  FileText,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/admin/layout/PageHeader";
import { getBasicInfo, updateBasicInfo } from "@/services/basicInfoService";
import { normalizeAddress } from "../utils/normalizeAddress";

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white";

const labelClass =
  "mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500";

const emptyAddress = {
  addressLine: "",
  pincode: "",
  city: "",
  state: "",
  country: "",
};

export default function BasicInfoPage() {
  const [form, setForm] = useState({
    gstNumber: "",
    companyName: "",
    invoiceDeclaration: "",
    invoiceContactText: "",
    invoiceFooterYear: "",
    shippingAddress: emptyAddress,
    billingAddress: emptyAddress,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadBasicInfo = useCallback(async (showToast = false) => {
    setIsFetching(true);
    try {
      const data = await getBasicInfo();
      if (data?.success && data?.data) {
        setForm({
          gstNumber: data.data.gstNumber || "",
          companyName: data.data.companyName || "",
          invoiceDeclaration: data.data.invoiceDeclaration || "",
          invoiceContactText: data.data.invoiceContactText || "",
          invoiceFooterYear: data.data.invoiceFooterYear || "",
          shippingAddress: normalizeAddress(data.data.shippingAddress),
          billingAddress: normalizeAddress(data.data.billingAddress),
        });
        if (showToast) toast.success("Basic info loaded");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load basic info",
      );
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    loadBasicInfo();
  }, [loadBasicInfo]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (section, field) => (event) => {
    const value =
      field === "pincode"
        ? event.target.value.replace(/\D/g, "").slice(0, 6)
        : event.target.value;
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.gstNumber.trim()) return toast.error("GST number is required");

    const requiredAddressFields = [
      ["addressLine", "address line"],
      ["city", "city"],
      ["state", "state"],
      ["pincode", "pincode"],
      ["country", "country"],
    ];

    for (const [field, label] of requiredAddressFields) {
      if (!form.shippingAddress[field].trim()) {
        return toast.error(`Shipping address ${label} is required`);
      }
    }

    for (const [field, label] of requiredAddressFields) {
      if (!form.billingAddress[field].trim()) {
        return toast.error(`Billing address ${label} is required`);
      }
    }

    setIsSaving(true);
    try {
      const data = await updateBasicInfo(form);
      if (data?.success) {
        setForm({
          gstNumber: data.data.gstNumber || "",
          companyName: data.data.companyName || "",
          invoiceDeclaration: data.data.invoiceDeclaration || "",
          invoiceContactText: data.data.invoiceContactText || "",
          invoiceFooterYear: data.data.invoiceFooterYear || "",
          shippingAddress: normalizeAddress(data.data.shippingAddress),
          billingAddress: normalizeAddress(data.data.billingAddress),
        });
        toast.success("Basic info saved");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save basic info",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      <PageHeader
        title="Invoice Info"
        subtitle="Customise invoice information in one place"
      />

      <div className="mb-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => loadBasicInfo(true)}
          disabled={isFetching || isSaving}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        >
          {isFetching ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Fetching...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Fetch Saved Info
            </>
          )}
        </button>
      </div>

      <section className="space-y-6">
        {/* Company Name */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Company Name</h3>
              <p className="text-xs font-medium text-slate-500">
                The legal or trade name shown on invoices and documents.
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Company Name</label>
            <input
              value={form.companyName}
              onChange={handleChange("companyName")}
              placeholder="e.g. Studio By Sheetal Pvt. Ltd."
              className={fieldClass}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Appears as the company name on the invoice header and footer. Default: &quot;Sheetal By Studios&quot;
            </p>
          </div>
        </div>

        {/* GST Details */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BadgeIndianRupee size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">GST Details</h3>
              <p className="text-xs font-medium text-slate-500">
                Store your GST registration number for invoices and compliance.
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>GST Number</label>
            <input
              value={form.gstNumber}
              onChange={handleChange("gstNumber")}
              placeholder="Enter GST number"
              className={fieldClass}
            />
          </div>
        </div>

        {/* Addresses */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AddressCard
            title="Shipping Address"
            subtitle="This is the address used for dispatch and delivery labels."
            icon={<Truck size={20} />}
            iconClassName="bg-emerald-50 text-emerald-600"
            sectionKey="shippingAddress"
            values={form.shippingAddress}
            onChange={handleAddressChange}
          />

          <AddressCard
            title="Billing Address"
            subtitle="Keep the billing address ready for accounting and tax docs."
            icon={<ReceiptText size={20} />}
            iconClassName="bg-amber-50 text-amber-600"
            sectionKey="billingAddress"
            values={form.billingAddress}
            onChange={handleAddressChange}
          />
        </div>

        {/* Invoice Customization */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Invoice Customization</h3>
              <p className="text-xs font-medium text-slate-500">
                Customize the text that appears on your customer invoices. Leave blank to use defaults.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Declaration Text
              </label>
              <textarea
                rows={3}
                value={form.invoiceDeclaration}
                onChange={handleChange("invoiceDeclaration")}
                placeholder="e.g. The goods sold as part of this shipment are intended for end-user consumption and are not for retail sale"
                className={`${fieldClass} resize-y`}
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Printed under the &quot;DECLARATION&quot; section at the bottom of the invoice.
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Contact / Support Text
              </label>
              <textarea
                rows={3}
                value={form.invoiceContactText}
                onChange={handleChange("invoiceContactText")}
                placeholder="e.g. If you have any questions, feel free to call customer care at +91 80 6156 1999 or log on to www.studiobysheetal.com/contact."
                className={`${fieldClass} resize-y`}
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                The customer support message shown at the bottom of the invoice below the declaration.
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Footer Year
              </label>
              <input
                value={form.invoiceFooterYear}
                onChange={handleChange("invoiceFooterYear")}
                placeholder={`e.g. ${new Date().getFullYear()}`}
                maxLength={4}
                className={fieldClass}
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                The year shown in the invoice footer copyright line (e.g. © 2026 Studio By Sheetal). Defaults to the current year if left blank.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Invoice Info
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

function AddressCard({
  title,
  subtitle,
  icon,
  iconClassName,
  sectionKey,
  values,
  onChange,
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelClass}>
            Address Line <span className="text-red-500">*</span>{" "}
          </label>
          <textarea
            rows={4}
            value={values.addressLine}
            onChange={onChange(sectionKey, "addressLine")}
            placeholder={`Enter ${title.toLowerCase()}`}
            className={`${fieldClass} min-h-32 resize-y`}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              City <span className="text-red-500">*</span>{" "}
            </label>
            <input
              value={values.city}
              onChange={onChange(sectionKey, "city")}
              placeholder="City"
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              State <span className="text-red-500">*</span>{" "}
            </label>
            <input
              value={values.state}
              onChange={onChange(sectionKey, "state")}
              placeholder="State"
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              Pincode <span className="text-red-500">*</span>{" "}
            </label>
            <input
              value={values.pincode}
              onChange={onChange(sectionKey, "pincode")}
              placeholder="Pincode"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              Country <span className="text-red-500">*</span>{" "}
            </label>
            <input
              value={values.country}
              onChange={onChange(sectionKey, "country")}
              placeholder="Country"
              className={fieldClass}
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}
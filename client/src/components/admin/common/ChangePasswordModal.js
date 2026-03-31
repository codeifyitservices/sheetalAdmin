"use client";
import { useState } from "react";
import { X, Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { updatePassword } from "@/services/adminService";

export default function ChangePasswordModal({ isOpen, onClose }) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const validations = [
        { label: "At least 8 characters", valid: newPassword.length >= 8 },
        { label: "One number", valid: /\d/.test(newPassword) },
        { label: "One lowercase letter", valid: /[a-z]/.test(newPassword) },
        { label: "One uppercase letter", valid: /[A-Z]/.test(newPassword) },
        { label: "One special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
    ];

    const allValid = validations.every((v) => v.valid);
    const passwordsMatch = newPassword && newPassword === confirmPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allValid || !passwordsMatch) return;

        setLoading(true);
        try {
            await updatePassword(newPassword);
            toast.success("Password updated successfully");
            onClose();
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            toast.error(error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full mb-3">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
                    <p className="text-sm text-slate-500">
                        Enter a new password for your account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full text-black px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-10"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full text-black px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all pr-10 ${confirmPassword && !passwordsMatch
                                        ? "border-red-300 focus:border-red-500 bg-red-50"
                                        : "border-slate-300 focus:border-emerald-500"
                                    }`}
                                placeholder="Confirm new password"
                            />
                        </div>
                        {confirmPassword && !passwordsMatch && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <XCircle size={12} /> Passwords do not match
                            </p>
                        )}
                    </div>

                    {/* Validation Checklist */}
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password Requirements</p>
                        <div className="grid grid-cols-1 gap-1">
                            {validations.map((v, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    {v.valid ? (
                                        <CheckCircle size={14} className="text-emerald-500" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>
                                    )}
                                    <span
                                        className={`text-xs ${v.valid ? "text-slate-700 font-medium" : "text-slate-500"
                                            }`}
                                    >
                                        {v.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 cursor-pointer py-2.5 px-4 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!allValid || !passwordsMatch || loading}
                            className="flex-1 cursor-pointer py-2.5 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

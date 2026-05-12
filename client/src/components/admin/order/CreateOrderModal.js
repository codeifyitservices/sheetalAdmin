"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  Plus,
  Trash2,
  MapPin,
  CreditCard,
  ShoppingBag,
  Loader2,
  Tag,
  Mail,
  User,
  Phone,
  ArrowLeft,
  Check,
} from "lucide-react";
import { getProducts } from "@/services/productService";
import { getUsers } from "@/services/userService";
import { createOrder } from "@/services/orderService";
import { toast } from "react-hot-toast";

export default function CreateOrderModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Stepper State
  const [step, setStep] = useState("products"); // 'products' | 'variants'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null); // The variant object (color)
  const [selectedSize, setSelectedSize] = useState(null); // The size object { name, stock, price }

  const [selectedItems, setSelectedItems] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [orderDiscount, setOrderDiscount] = useState(0);

  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [customerDetails, setCustomerDetails] = useState({
    customerId: "",
    email: "",
    fullName: "",
    phoneNumber: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const res = await getProducts(1, 1000);
      if (res.success) setProducts(res.products || res.data?.products || []);
    } catch (err) {
      toast.error("Products load fail");
    }
  };

  // --- Customer Search Logic ---
  const handleCustomerSearch = async (val) => {
    setCustomerSearch(val);
    setCustomerDetails((prev) => ({ ...prev, customerId: "", email: val })); // Keep email synced
    if (val.length > 2) {
      try {
        const res = await getUsers(1, 10, val);
        if (res.success && res.data) {
          setCustomerResults(res.data || []);
          setShowCustomerDropdown(true);
        }
      } catch (err) {
        console.error("User search failed", err);
      }
    } else {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (user) => {
    const addr = user.addresses?.[0];
    setCustomerDetails({
      customerId: user._id,
      email: user.email,
      fullName: addr ? `${addr.firstName} ${addr.lastName}` : user.name,
      phoneNumber: addr ? addr.phoneNumber : (user.phoneNumber || ""),
      addressLine1: addr ? addr.addressLine1 : "",
      city: addr ? addr.city : "",
      state: addr ? addr.state : "",
      postalCode: addr ? addr.postalCode : "",
    });
    setCustomerSearch(user.email);
    setShowCustomerDropdown(false);
  };


  // --- Product/Variant Logic ---

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    // Auto-select first variant if exists, else it's a simple product (handle generic)
    // But based on schema, products usually have variants array.
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
      // Auto-select first size if exists
      if (product.variants[0].sizes?.length > 0) {
        setSelectedSize(product.variants[0].sizes[0]);
      } else {
        setSelectedSize(null);
      }
    }
    setStep("variants");
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    if (variant.sizes?.length > 0) {
      setSelectedSize(variant.sizes[0]);
    } else {
      setSelectedSize(null);
    }
  };

  const addItemToOrder = () => {
    if (!selectedProduct) return;

    // Construct item object
    // Key should be unique: product_id + variant_sku + size_name
    const variantKey = selectedVariant ? selectedVariant.v_sku : "default";
    const sizeKey = selectedSize ? selectedSize.name : "default";
    const uniqueId = `${selectedProduct._id}-${variantKey}-${sizeKey}`;

    const exist = selectedItems.find((x) => x.uniqueId === uniqueId);

    const maxStock = selectedSize ? selectedSize.stock : selectedProduct.stock;
    const price = selectedSize ? (selectedSize.discountPrice || selectedSize.price) : (selectedProduct.discountPrice || selectedProduct.price);

    if (exist && exist.quantity >= maxStock) {
      return toast.error("Stock limit reached for this variation!");
    }

    if (exist) {
      setSelectedItems(selectedItems.map(x =>
        x.uniqueId === uniqueId ? { ...x, quantity: x.quantity + 1 } : x
      ));
    } else {
      // New Item
      const newItem = {
        uniqueId,
        product: selectedProduct._id,
        name: selectedProduct.name,
        image: selectedVariant?.v_image?.url || selectedProduct.images[0]?.url,
        price: price,
        quantity: 1,
        maxStock: maxStock,
        variant: {
          size: selectedSize?.name,
          color: selectedVariant?.color?.name,
          v_sku: selectedVariant?.v_sku
        }
      };
      setSelectedItems([...selectedItems, newItem]);
    }
    toast.success("Added to Order");
  };

  const removeItem = (uniqueId) =>
    setSelectedItems(selectedItems.filter((x) => x.uniqueId !== uniqueId));

  const subTotal = selectedItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const finalTotal = Math.max(0, subTotal - orderDiscount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return toast.error("Cart खाली है!");
    if (!customerDetails.email) return toast.error("Customer Email is required!");

    setLoading(true);
    try {
      const orderData = {
        orderItems: selectedItems,
        shippingAddress: {
          fullName: customerDetails.fullName,
          phoneNumber: customerDetails.phoneNumber,
          addressLine1: customerDetails.addressLine1,
          city: customerDetails.city,
          state: customerDetails.state, // State field added here
          postalCode: customerDetails.postalCode,
          country: "India",
        },
        customerId: customerDetails.customerId || undefined,
        userEmail: customerDetails.email,
        paymentInfo: { method: paymentMethod, status: "Pending" },
        itemsPrice: subTotal,
        totalPrice: finalTotal,
        discountPrice: orderDiscount,
        couponCode: couponCode,
        isCreatedByAdmin: true,
      };

      const res = await createOrder(orderData);
      if (res.success) {
        toast.success("Order Placed");
        onSuccess();
        onClose();
        resetForm();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Order failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedItems([]);
    setCustomerDetails({
      customerId: "",
      email: "",
      fullName: "",
      phoneNumber: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
    });
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    setOrderDiscount(0);
    setCouponCode("");
    setStep("products");
    setSelectedProduct(null);
    setSelectedVariant(null);
    setSelectedSize(null);
  };

  const getProductPrice = (product) => {
    if (!product.variants || product.variants.length === 0) return "N/A";

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    product.variants.forEach((v) => {
      v.sizes.forEach((s) => {
        const p = s.discountPrice > 0 ? s.discountPrice : s.price;
        if (p < minPrice) minPrice = p;
        if (p > maxPrice) maxPrice = p;
      });
    });

    if (minPrice === Infinity) return "N/A";
    if (minPrice === maxPrice) return `₹${minPrice}`;
    return `₹${minPrice} - ₹${maxPrice}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-slate-900 rounded-full" />
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                New Manual Order
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Inventory & Customer Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 cursor-pointer rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Product Selection (Stepper) */}
          <div className="flex-[1.2] overflow-y-auto p-8 border-r border-slate-50 space-y-6 bg-white">
            {step === "products" ? (
              // Step 1: Product List
              <>
                <div className="relative">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                    placeholder="Search by name or SKU..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {products
                    .filter((p) =>
                      p.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl hover:bg-slate-50/50 transition-all group cursor-pointer"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                            <img
                              src={p.images[0]?.url}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 line-clamp-1">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Stock: {p.stock} | SKU: {p.sku || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-slate-900">
                            {getProductPrice(p)}
                          </span>
                          <button className="p-2 cursor-pointer bg-slate-50 text-slate-400 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              // Step 2: Variant Selection
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <button
                  onClick={() => setStep("products")}
                  className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Products
                </button>

                {selectedProduct && (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <img
                          src={selectedVariant ? (selectedVariant.v_image?.url || selectedProduct.images[0]?.url) : selectedProduct.images[0]?.url}
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 leading-tight">{selectedProduct.name}</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{selectedProduct.sku}</p>
                        <p className="text-xl font-black text-slate-900 mt-2">
                          {selectedSize
                            ? `₹${selectedSize.discountPrice || selectedSize.price}`
                            : getProductPrice(selectedProduct)}
                        </p>
                      </div>
                    </div>

                    {/* Variants (Colors) */}
                    {selectedProduct.variants?.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Select Variant</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variants.map((variant, idx) => (
                            <div
                              key={variant._id || idx}
                              onClick={() => handleVariantChange(variant)}
                              className={`p-1 rounded-full border-2 cursor-pointer transition-all ${selectedVariant?._id === variant._id ? 'border-slate-900 scale-105' : 'border-transparent hover:border-slate-200'}`}
                            >
                              <div
                                className="w-8 h-8 rounded-full border border-slate-200"
                                style={{ backgroundColor: variant.color?.code || '#eee' }}
                                title={variant.color?.name}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs font-bold text-slate-700">Selected: {selectedVariant?.color?.name}</p>
                      </div>
                    )}

                    {/* Sizes */}
                    {selectedVariant?.sizes?.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Select Size</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedVariant.sizes.map((size, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSize(size)}
                              disabled={size.stock <= 0}
                              className={`px-4 py-2 cursor-pointer rounded-lg text-xs font-bold border transition-all ${selectedSize?.name === size.name
                                ? 'bg-slate-900 text-white border-slate-900'
                                : size.stock > 0
                                  ? 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                  : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
                            >
                              {size.name} <span className="opacity-60 text-[10px] ml-1">({size.stock})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={addItemToOrder}
                      disabled={!selectedSize || selectedSize.stock <= 0}
                      className="w-full py-4 cursor-pointer bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      <Plus size={18} /> Add to Selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Checkout & Customer Details */}
          <div className="flex-1 bg-slate-50/40 p-8 overflow-y-auto border-l border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Customer Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] flex items-center gap-2">
                  <User size={14} /> Customer Profile
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-3.5 text-slate-300"
                      size={16}
                    />
                    <input
                      type="text" // Change to text to allow searching by name/email
                      className="order-input"
                      placeholder="Search Customer by Email or Name..."
                      value={customerSearch || ""}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => setShowCustomerDropdown(true)}
                      autoComplete="off"
                    />
                    {/* Autocomplete Dropdown */}
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {customerResults.map((user) => (
                          <div
                            key={user._id}
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                            onClick={() => selectCustomer(user)}
                          >
                            <p className="text-xs font-bold text-slate-800">{user.name}</p>
                            <p className="text-[10px] text-slate-500">{user.email}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    required
                    className="order-input-no-icon"
                    placeholder="Full Name"
                    value={customerDetails.fullName}
                    onChange={(e) =>
                      setCustomerDetails({
                        ...customerDetails,
                        fullName: e.target.value,
                      })
                    }
                  />
                  <input
                    required
                    className="order-input-no-icon"
                    placeholder="Phone Number"
                    value={customerDetails.phoneNumber}
                    onChange={(e) =>
                      setCustomerDetails({
                        ...customerDetails,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                  <input
                    required
                    className="order-input-no-icon"
                    placeholder="Shipping Address"
                    value={customerDetails.addressLine1}
                    onChange={(e) =>
                      setCustomerDetails({
                        ...customerDetails,
                        addressLine1: e.target.value,
                      })
                    }
                  />

                  {/* Yahan State add kiya hai 3 columns mein */}
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      required
                      className="order-input-no-icon"
                      placeholder="City"
                      value={customerDetails.city}
                      onChange={(e) =>
                        setCustomerDetails({
                          ...customerDetails,
                          city: e.target.value,
                        })
                      }
                    />
                    <input
                      required
                      className="order-input-no-icon"
                      placeholder="State"
                      value={customerDetails.state}
                      onChange={(e) =>
                        setCustomerDetails({
                          ...customerDetails,
                          state: e.target.value,
                        })
                      }
                    />
                    <input
                      required
                      className="order-input-no-icon"
                      placeholder="Pin"
                      value={customerDetails.postalCode}
                      onChange={(e) =>
                        setCustomerDetails({
                          ...customerDetails,
                          postalCode: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary & Coupon */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">
                  Order Summary
                </h3>

                <div className="max-h-[150px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {selectedItems.map((item) => (
                    <div
                      key={item.uniqueId}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="text-slate-600 font-medium">
                        {item.name}{" "}
                        <span className="text-slate-400">x{item.quantity}</span>
                        {/* Variant Info Display */}
                        {item.variant?.size && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {item.variant.size} - {item.variant.color}
                          </div>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">
                          ₹{item.price * item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.uniqueId)}
                          className="text-slate-300 cursor-pointer hover:text-rose-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Global Coupon Input */}
                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Apply Coupon / Discount
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        className="absolute left-3 top-2.5 text-slate-300"
                        size={14}
                      />
                      <input
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-200"
                        placeholder="Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                    </div>
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        className="w-full pl-6 pr-2 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-slate-200"
                        placeholder="0"
                        value={orderDiscount}
                        onChange={(e) =>
                          setOrderDiscount(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Final Math */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{subTotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-600 font-bold">
                    <span>Discount {couponCode && `(${couponCode})`}</span>
                    <span>- ₹{orderDiscount}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-slate-900 pt-2">
                    <span>Total</span>
                    <span>₹{finalTotal}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || selectedItems.length === 0}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl disabled:bg-slate-200 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>Finalize & Place Order</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .order-input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.5rem;
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          outline: none;
        }
        .order-input-no-icon {
          width: 100%;
          padding: 0.85rem 1rem;
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          outline: none;
        }
        .order-input:focus,
        .order-input-no-icon:focus {
          border-color: #cbd5e1;
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

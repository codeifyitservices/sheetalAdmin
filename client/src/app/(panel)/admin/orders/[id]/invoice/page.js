"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { getAdminOrderById } from "@/services/orderService";
import { getBasicInfo } from "@/services/basicInfoService";

const emptyAddress = {
  addressLine: "",
  pincode: "",
  city: "",
  state: "",
  country: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const shortId = (id) => String(id || "").slice(-10).toUpperCase();

const formatPaymentMode = (paymentInfo = {}) => {
  if (paymentInfo.displayMethod?.trim()) {
    return paymentInfo.displayMethod.trim();
  }

  return paymentInfo.method === "COD" ? "Cash on Delivery" : "Online";
};

const formatAddressLines = (address = emptyAddress) => {
  const lines = [
    address.addressLine,
    [address.city, address.state].filter(Boolean).join(", "),
    [address.pincode, address.country].filter(Boolean).join(" "),
  ].filter(Boolean);

  return lines.length > 0 ? lines : ["Not configured"];
};

function AdminInvoicePageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const hasPrintedRef = useRef(false);
  const orderId = params?.id ? String(params.id) : "";
  const shouldAutoPrint = searchParams.get("print") === "1";

  const [order, setOrder] = useState(null);
  const [basicInfo, setBasicInfo] = useState({
    gstNumber: "",
    shippingAddress: emptyAddress,
    billingAddress: emptyAddress,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!orderId) {
        setError("No order was found for this invoice.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [orderRes, basicInfoRes] = await Promise.allSettled([
          getAdminOrderById(orderId),
          getBasicInfo(),
        ]);

        if (orderRes.status === "fulfilled") {
          const res = orderRes.value;
          if (res?.success && res?.data) {
            setOrder(res.data);
          } else {
            setError(res?.message || "Unable to load this invoice.");
          }
        } else {
          setError("Unable to load this invoice right now.");
        }

        if (basicInfoRes.status === "fulfilled") {
          const res = basicInfoRes.value;
          if (res?.success && res?.data) {
            setBasicInfo({
              gstNumber: res.data.gstNumber || "",
              shippingAddress: res.data.shippingAddress || emptyAddress,
              billingAddress: res.data.billingAddress || emptyAddress,
            });
          }
        }
      } catch {
        setError("Unable to load this invoice right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [orderId]);

  useEffect(() => {
    if (!shouldAutoPrint || loading || error || !order || hasPrintedRef.current) {
      return;
    }

    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [shouldAutoPrint, loading, error, order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded shadow-md text-center max-w-md w-full">
          <div className="w-12 h-12 border-4 border-[#bd9951] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded shadow-md text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-red-600 mb-2">
            Invoice unavailable
          </h1>
          <p className="text-gray-600 mb-4 text-sm">
            {error || "We couldn't find the order for this invoice."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="block w-full bg-black text-white py-3 rounded font-semibold hover:bg-gray-800 transition cursor-pointer"
            >
              Go Back
            </button>
            <Link
              href="/admin/orders"
              className="block w-full border border-gray-300 text-gray-700 py-3 rounded font-semibold hover:bg-gray-50 transition"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const invoiceDate = fmtDate(order.createdAt);
  const orderDate = fmtDate(order.createdAt);
  const invoiceNumber = `I${shortId(order._id)}`;
  const paymentMode = formatPaymentMode(order.paymentInfo);
  const shippingAddressLines = [
    order.shippingAddress?.addressLine1,
    [
      order.shippingAddress?.city,
      order.shippingAddress?.state,
      order.shippingAddress?.postalCode
        ? `- ${order.shippingAddress.postalCode}`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    order.shippingAddress?.country,
  ].filter(Boolean);
  const billingAddressLines = formatAddressLines(basicInfo.billingAddress);
  const shippingOfficeLines = formatAddressLines(basicInfo.shippingAddress);

  return (
    <>
      <style>{`
        * { font-family: var(--font-montserrat), sans-serif; }
        @page { size: auto; margin: 12mm; }
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          main {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          main > div {
            max-width: none !important;
          }

          body > div,
          body > div > div,
          body > div > div > div,
          body > div > div > div > div {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }

          .invoice-print-root {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .invoice-print-sheet {
            border: 0 !important;
            box-shadow: none !important;
          }

          .invoice-print-x {
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="invoice-print-root m-5 bg-white">
        <div className="invoice-print-sheet w-full border border-[#01008b47]">
          <div className="px-[30px] pt-[36px] pb-[42px]">
            <table className="w-full border-collapse mb-0">
              <tbody>
                <tr>
                  <td className="align-top p-0 flex justify-center text-[#153643] w-25 h-25">
                    <Link href="/admin/orders">
                      <Image
                        src="/favicon.png"
                        alt="Studio By Sheetal"
                        width={100}
                        height={100}
                        className="block h-full w-auto"
                      />
                    </Link>
                  </td>
                  <td className="align-top text-right text-[#153643]">
                    <h1 className="text-[32px] font-bold my-5">
                      Sheetal By Studios
                    </h1>
                    <p className="text-[16px]">
                      <strong>GSTIN Number:</strong>{" "}
                      {basicInfo.gstNumber || "Not configured"}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="pb-9 text-center text-[#153643]">
                    <h1 className="text-[32px] font-bold my-5">Tax Invoice</h1>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="pb-[36px] text-[#153643]">
                    <table className="w-full border-collapse bg-white mb-0">
                      <tbody>
                        <tr>
                          <td className="p-0">
                            <p className="text-[16px] text-[#111111] m-0 mb-[15px]">
                              <strong className="text-[#111111]">
                                Invoice Number #:
                              </strong>{" "}
                              {invoiceNumber}
                            </p>
                          </td>
                          <td className="p-0 text-right">
                            <p className="text-[16px] text-[#111111] m-0 mb-[15px]">
                              <strong className="text-[#111111]">
                                Order #:
                              </strong>{" "}
                              {order._id}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-0">
                            <p className="text-[16px] text-[#111111] m-0 mb-[15px]">
                              <strong className="text-[#111111]">
                                Invoice Date:
                              </strong>{" "}
                              {invoiceDate}
                            </p>
                          </td>
                          <td className="p-0 text-right">
                            <p className="text-[16px] text-[#111111] m-0 mb-[15px]">
                              <strong className="text-[#111111]">
                                Order Date:
                              </strong>{" "}
                              {orderDate}
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td colSpan={2}>
                            <div className="invoice-print-x overflow-x-auto">
                              <table className="w-full border-collapse bg-white">
                                <colgroup>
                                  <col className="w-[47%]" />
                                  <col className="w-[15%]" />
                                  <col className="w-[25%]" />
                                  <col className="w-[15%]" />
                                  <col className="w-[15%]" />
                                </colgroup>
                                <thead>
                                  <tr className="bg-[#f6f6f6]">
                                    <th className="border border-[#ccc] p-[13px] text-left text-[16px] text-[#111111] font-semibold">
                                      Product List
                                    </th>
                                    <th className="border border-[#ccc] p-[13px] text-left text-[16px] text-[#111111] font-semibold">
                                      MRP
                                    </th>
                                    <th className="border border-[#ccc] p-[13px] text-left text-[16px] text-[#111111] font-semibold">
                                      Selling Price
                                    </th>
                                    <th className="border border-[#ccc] p-[13px] text-left text-[16px] text-[#111111] font-semibold">
                                      Qty
                                    </th>
                                    <th className="border border-[#ccc] p-[13px] text-right text-[16px] text-[#111111] font-semibold">
                                      Amount
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.orderItems.map((item) => (
                                    <tr key={item._id}>
                                      <td className="border border-[#ccc] p-[13px] text-[16px] text-[#111111]">
                                        <div>
                                          <div>{item.name}</div>
                                          {(item.variant?.size ||
                                            item.variant?.color ||
                                            item.variant?.v_sku) && (
                                            <div className="mt-1 text-[13px] leading-[20px] text-[#555555]">
                                              {item.variant?.size && (
                                                <div>
                                                  <strong>Variant:</strong>{" "}
                                                  {item.variant.size}
                                                </div>
                                              )}
                                              {item.variant?.color && (
                                                <div>
                                                  <strong>Color:</strong>{" "}
                                                  {item.variant.color}
                                                </div>
                                              )}
                                              {item.variant?.v_sku && (
                                                <div>
                                                  <strong>SKU:</strong>{" "}
                                                  {item.variant.v_sku}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="border border-[#ccc] p-[13px] text-[16px] text-[#111111]">
                                        {money(item.price)}
                                      </td>
                                      <td className="border border-[#ccc] p-[13px] text-[16px] text-[#111111]">
                                        {money(item.price)}
                                      </td>
                                      <td className="border border-[#ccc] p-[13px] text-[16px] text-[#111111]">
                                        {item.quantity}
                                      </td>
                                      <td className="border border-[#ccc] p-[13px] text-[16px] text-[#111111] text-right">
                                        {money(item.price * item.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="invoice-print-x overflow-x-auto">
                              <table className="w-full border-collapse bg-white">
                                <colgroup>
                                  <col className="w-[39%]" />
                                  <col className="w-[35%]" />
                                  <col className="w-[15%]" />
                                </colgroup>
                                <tbody>
                                  <tr className="border-y border-[#ccc]">
                                    <td className="border-y border-l border-[#ccc] pl-[14px] text-[16px] leading-[1.55em] text-[#111111]">
                                      <strong className="text-[#111111]">
                                        Mode of Payment
                                      </strong>
                                      <br />
                                      {paymentMode}
                                    </td>
                                    <td className="border-y border-[#ccc] text-[16px] leading-[1.55em] text-left text-[#111111]">
                                      <p className="text-[#111111] text-[16px] my-4">
                                        Sub Total:
                                      </p>
                                      {order.discountPrice > 0 && (
                                        <p className="text-[#111111] text-[16px] my-4">
                                          Discount:
                                        </p>
                                      )}
                                      <p className="text-[#111111] text-[16px] my-4">
                                        Shipping Charges:
                                      </p>
                                      <p className="text-[#111111] text-[16px] my-4">
                                        Tax:
                                      </p>
                                    </td>
                                    <td className="border-y border-r border-[#ccc] text-[16px] leading-[1.55em] text-left text-[#111111]">
                                      <p className="text-[#111111] text-[16px] my-4 text-left">
                                        {money(order.itemsPrice)}
                                      </p>
                                      {order.discountPrice > 0 && (
                                        <p className="text-[#111111] text-[16px] my-4 text-left">
                                          -{money(order.discountPrice)}
                                          {order.couponCode
                                            ? ` (${order.couponCode})`
                                            : ""}
                                        </p>
                                      )}
                                      <p className="text-[#111111] text-[16px] my-4 text-left">
                                        {order.shippingPrice > 0
                                          ? money(order.shippingPrice)
                                          : "FREE"}
                                      </p>
                                      <p className="text-[#111111] text-[16px] my-4 text-left">
                                        {order.taxPrice > 0
                                          ? money(order.taxPrice)
                                          : money(0)}
                                      </p>
                                    </td>
                                  </tr>
                                  <tr className="border border-[#ccc]">
                                    <td className="border-y border-l border-[#ccc] text-[16px]">
                                      &nbsp;
                                    </td>
                                    <td className="border-y border-[#ccc] text-[16px] text-left text-[#111111]">
                                      <p className="text-[#111111] text-[16px] my-4">
                                        <strong className="text-[#111111]">
                                          Total Amount:
                                        </strong>
                                      </p>
                                    </td>
                                    <td className="border-y border-[#ccc] text-[16px] text-left text-[#111111]">
                                      <p className="text-[#111111] font-bold text-[16px] my-4 text-left">
                                        <strong className="text-[#111111]">
                                          {money(order.totalPrice)}
                                        </strong>
                                      </p>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td className="align-top text-[16px] text-[#111111]">
                            <p className="text-[16px] font-medium text-[#111111] my-4">
                              <strong className="text-[#111111]">
                                Delivery to:
                              </strong>
                            </p>
                            <p className="leading-[25px] my-4">
                              <strong>{order.shippingAddress.fullName}</strong>
                              <br />
                              {shippingAddressLines.map((line) => (
                                <span key={line}>
                                  {line}
                                  <br />
                                </span>
                              ))}
                            </p>
                            <p className="my-4">
                              <strong>Email:</strong>{" "}
                              {order.user?.email || "Not available"}
                            </p>
                            <p className="my-4">
                              <strong>Phone no.:</strong>{" "}
                              {order.shippingAddress.phoneNumber}
                            </p>
                          </td>
                          <td className="align-top text-[16px] text-[#111111]">
                            <p className="text-[16px] font-medium text-[#111111] my-4">
                              <strong className="text-[#111111]">
                                Ship to:
                              </strong>
                            </p>
                            <p className="leading-[25px] my-4">
                              <strong>{order.shippingAddress.fullName}</strong>
                              <br />
                              {shippingAddressLines.map((line) => (
                                <span key={line}>
                                  {line}
                                  <br />
                                </span>
                              ))}
                            </p>
                            <p className="my-4">
                              <strong>Email:</strong>{" "}
                              {order.user?.email || "Not available"}
                            </p>
                            <p className="my-4">
                              <strong>Phone no.:</strong>{" "}
                              {order.shippingAddress.phoneNumber}
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td className="align-top text-[16px] text-[#111111] ">
                            <p className="text-[16px] text-[#111111] my-4">
                              <strong className="text-[#111111]">
                                Bill from:
                              </strong>
                            </p>
                            <p className="leading-[25px] mt-0 mb-0">
                              <strong className="text-[#153643]">
                                Studio By Sheetal Pvt. Ltd.
                              </strong>
                              <br />
                              {billingAddressLines.map((line, idx) => (
                                <span key={`${line}-${idx}`}>
                                  {line}
                                  <br />
                                </span>
                              ))}
                            </p>
                          </td>
                          <td className="align-top text-[16px] text-[#111111]">
                            <p className="text-[16px] text-[#111111] my-4">
                              <strong className="text-[#111111]">
                                Ship from:
                              </strong>
                            </p>
                            <p className="leading-[25px] mt-0 mb-0">
                              <strong className="text-[#153643]">
                                Studio By Sheetal Pvt. Ltd.
                              </strong>
                              <br />
                              {shippingOfficeLines.map((line, idx) => (
                                <span key={`${line}-${idx}`}>
                                  {line}
                                  <br />
                                </span>
                              ))}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="my-4">&nbsp;</p>

                    <p className="m-0 text-[14px] leading-[24px]">
                      <strong>DECLARATION</strong>,<br />
                      The goods sold as part of this shipment are intended for
                      end-user consumption and are not for retail sale
                    </p>

                    <p className="my-4">&nbsp;</p>

                    <p className="m-0 text-[14px] leading-[24px]">
                      If you have any questions, feel free to call customer care
                      at +91 80 6156 1999 or use Contact Us section in our App,
                      or log on to{" "}
                      <a
                        href="https://www.studiobysheetal.com/contact"
                        className="underline text-inherit"
                      >
                        www.studiobysheetal.com/contact
                      </a>
                      .
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-[#166900] px-[30px] py-[30px]">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="p-0 text-center">
                    <p className="m-0 text-[14px] leading-[16px] text-white">
                      © 2026{" "}
                      <Link href="/admin/orders" className="text-white underline">
                        Studio By Sheetal
                      </Link>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-[30px] py-[30px] no-print">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/admin/orders"
                className="border border-gray-300 text-black text-[16px] px-[13px] py-[9px] bg-transparent rounded-[4px] hover:bg-gray-50"
              >
                Back to Orders
              </Link>
              <button
                onClick={() => window.print()}
                className="border border-black text-black text-[16px] px-[13px] py-[9px] bg-transparent rounded-[4px] cursor-pointer hover:bg-gray-50"
              >
                Print this page
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white p-8 rounded shadow-md text-center max-w-md w-full">
            <div className="w-12 h-12 border-4 border-[#bd9951] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      }
    >
      <AdminInvoicePageInner />
    </Suspense>
  );
}

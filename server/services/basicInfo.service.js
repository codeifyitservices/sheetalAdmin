import BasicInfo from "../models/basicInfo.model.js";

const SINGLETON_KEY = "singleton";

const ensureBasicInfo = async () => {
  return BasicInfo.findOneAndUpdate(
    { singletonKey: SINGLETON_KEY },
    {
      $setOnInsert: {
        singletonKey: SINGLETON_KEY,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  );
};

const normalizeAddress = (value = {}) => {
  if (!value || typeof value !== "object") {
    return {
      addressLine: typeof value === "string" ? value : "",
      pincode: "",
      city: "",
      state: "",
      country: "",
    };
  }

  return {
    addressLine: value.addressLine ?? "",
    pincode: value.pincode ?? "",
    city: value.city ?? "",
    state: value.state ?? "",
    country: value.country ?? "",
  };
};

export const getBasicInfo = async () => {
  try {
    const basicInfo = await ensureBasicInfo();
    const data = basicInfo.toObject ? basicInfo.toObject() : basicInfo;
    return {
      success: true,
      data: {
        ...data,
        shippingAddress: normalizeAddress(data.shippingAddress),
        billingAddress: normalizeAddress(data.billingAddress),
      },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateBasicInfo = async (data, userId = null) => {
  try {
    const payload = {
      gstNumber: data.gstNumber ?? "",
      companyName: data.companyName ?? "",
      invoiceDeclaration: data.invoiceDeclaration ?? "",
      invoiceContactText: data.invoiceContactText ?? "",
      invoiceFooterYear: data.invoiceFooterYear ?? "",
      shippingAddress: normalizeAddress(data.shippingAddress),
      billingAddress: normalizeAddress(data.billingAddress),
    };

    if (userId) {
      payload.updatedBy = userId;
    }

    const basicInfo = await BasicInfo.findOneAndUpdate(
      { singletonKey: SINGLETON_KEY },
      {
        $setOnInsert: {
          singletonKey: SINGLETON_KEY,
        },
        $set: payload,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    return { success: true, data: basicInfo };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

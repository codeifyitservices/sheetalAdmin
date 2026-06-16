// Address Management Services
export const addAddressService = async (userId, addressData) => {
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, statusCode: 404, message: "User not found" };
  }

  // If this is the first address or set as default, handle that logic
  if (addressData.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
    addressData.isDefault = true;
  }

  user.addresses.push(addressData);
  await user.save();

  return {
    success: true,
    message: "Address added successfully",
    data: user.addresses,
  };
};

export const updateAddressService = async (userId, addressId, addressData) => {
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, statusCode: 404, message: "User not found" };
  }

  const addressIndex = user.addresses.findIndex(
    (addr) => addr._id.toString() === addressId,
  );
  if (addressIndex === -1) {
    return { success: false, statusCode: 404, message: "Address not found" };
  }

  // If setting as default, unset others //
  if (addressData.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  Object.assign(user.addresses[addressIndex], addressData);

  await user.save();

  return {
    success: true,
    message: "Address updated successfully",
    data: user.addresses,
  };
};

export const deleteAddressService = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, statusCode: 404, message: "User not found" };
  }

  user.addresses = user.addresses.filter(
    (addr) => addr._id.toString() !== addressId,
  );
  await user.save();

  return {
    success: true,
    message: "Address deleted successfully",
    data: user.addresses,
  };
};

export const setDefaultAddressService = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, statusCode: 404, message: "User not found" };
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    return { success: false, statusCode: 404, message: "Address not found" };
  }

  user.addresses.forEach((addr) => (addr.isDefault = false));
  address.isDefault = true;

  await user.save();

  return {
    success: true,
    message: "Default address updated successfully",
    data: user.addresses,
  };
};

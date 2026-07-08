import * as authService from "../services/auth.service.js";
import successResponse from "../utils/successResponse.js";

const cookieOptions = {
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

//  register
export const register = async (req, res, next) => {
  try {
    const result = await authService.registerService(req.body);
    if (!result.success) return res.status(result.statusCode).json(result);
    res.cookie("token", result.token, cookieOptions);
    return successResponse(
      res,
      201,
      { user: result.user, token: result.token },
      "Account created successfully",
    );
  } catch (error) {
    next(error);
  }
};

// login
export const login = async (req, res, next) => {
  try {
    const result = await authService.loginService(req.body);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    res.cookie("token", result.token, cookieOptions);

    return successResponse(res, 200, { user: result.user, token: result.token }, "Login successful");
  } catch (error) {
    next(error);
  }
};

// status
export const getAuthStatus = (req, res) => {
  return successResponse(res, 200, { isAuthenticated: true, user: req.user });
};

// logout
export const logout = (req, res) => {
  res.cookie("token", "", { ...cookieOptions, expires: new Date(0) });
  return successResponse(res, 200, undefined, "Logged out successfully");
};

// forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPasswordService(req.body.email);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      { resetToken: result.resetToken },
      result.message,
    );
  } catch (error) {
    next(error);
  }
};

// reset password
export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPasswordService(
      req.params.token,
      req.body.password,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, null, result.message);
  } catch (error) {
    next(error);
  }
};

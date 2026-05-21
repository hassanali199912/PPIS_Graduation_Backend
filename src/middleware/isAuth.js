const jwt = require("jsonwebtoken");

/**
 * @param {Error & { statusCode?: number; name?: string }} err
 */
function mapTokenError(err) {
  if (err.statusCode) {
    return { statusCode: err.statusCode, message: err.message };
  }

  if (err.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      message: "Your session has expired. Please log in again.",
    };
  }

  if (err.name === "JsonWebTokenError") {
    return {
      statusCode: 401,
      message: "Invalid or malformed token. Please log in again.",
    };
  }

  if (err.name === "NotBeforeError") {
    return {
      statusCode: 401,
      message: "Token is not active yet.",
    };
  }

  if (err.message === "JWT_SECRET is not set") {
    return {
      statusCode: 500,
      message: "Authentication is not configured on the server.",
    };
  }

  return {
    statusCode: 401,
    message: "Authentication failed. Please log in again.",
  };
}

const checkToken = (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");

    if (!authHeader || typeof authHeader !== "string") {
      return res.status(401).json({
        message: "Authorization header is required. Use: Bearer <token>",
      });
    }

    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid authorization format. Use: Bearer <token>",
      });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({
        message: "Bearer token is missing.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({
        message: "Authentication is not configured on the server.",
      });
    }

    const decodedToken = jwt.verify(token, secret);

    if (!decodedToken?.id) {
      return res.status(401).json({
        message: "Invalid token payload. Please log in again.",
      });
    }

    req.userId = decodedToken.id;
    req.role = decodedToken.role;
    return next();
  } catch (err) {
    console.warn("Auth middleware:", err.name || err.message);
    const { statusCode, message } = mapTokenError(err);
    return res.status(statusCode).json({ message });
  }
};

module.exports = {
  checkToken,
};

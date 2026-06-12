import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const JWT_SECRET = process.env.JWT_SECRET!;

// Generate short-lived access token
function generateAccessToken() {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "15m" });
}

// Generate long-lived refresh token
function generateRefreshToken() {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}

/* ---------------------------------------------------
   ⭐ ADMIN LOGIN
--------------------------------------------------- */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();

  // Store refresh token in HttpOnly cookie
  res.cookie("admin_refresh", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ accessToken });
});

/* ---------------------------------------------------
   ⭐ ADMIN REFRESH TOKEN
--------------------------------------------------- */
router.post("/refresh", (req, res) => {
  const token = req.cookies.admin_refresh;

  if (!token) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  try {
    jwt.verify(token, JWT_SECRET);

    const newAccessToken = generateAccessToken();

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

/* ---------------------------------------------------
   ⭐ ADMIN LOGOUT
--------------------------------------------------- */
router.post("/logout", (req, res) => {
  res.clearCookie("admin_refresh");
  res.json({ message: "Logged out" });
});

export default router;

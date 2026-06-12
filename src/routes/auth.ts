import { Router } from "express";
import { createUser } from "../models/User";

const router = Router();

/* ---------------------------------------------------
   ⭐ Simple login/register (temporary)
--------------------------------------------------- */
router.post("/login", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "name, email, and password are required",
    });
  }

  // Create user (no hashing yet — temporary)
  const user = await createUser(name, email, password);

  res.json(user);
});

/* ---------------------------------------------------
   ⭐ Remove /users endpoint (no getAllUsers in model)
--------------------------------------------------- */
router.get("/users", (_req, res) => {
  return res.status(410).json({
    message: "This endpoint has been removed. No getAllUsers() available.",
  });
});

export default router;

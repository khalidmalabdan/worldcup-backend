import { Router } from "express";
import { createUser, getAllUsers } from "../models/User";

const router = Router();

// fake "login" – just creates a user and returns it
router.post("/login", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: "name and email required" });
  const user = createUser(name, email);
  res.json(user);
});

router.get("/users", (_req, res) => {
  res.json(getAllUsers());
});

export default router;

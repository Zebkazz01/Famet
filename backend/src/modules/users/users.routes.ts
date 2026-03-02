import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { authenticate, authorize } from "../../middleware/auth";
import { prisma } from "../../config/database";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "CASHIER"]).default("CASHIER"),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(["ADMIN", "CASHIER"]).optional(),
  active: z.boolean().optional(),
});

router.get("/", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return res.json(users);
});

router.post("/", authenticate, authorize("ADMIN"), validate(createUserSchema), async (req: Request, res: Response) => {
  const { username, password, name, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, name, role },
    select: { id: true, username: true, name: true, role: true, active: true },
  });
  return res.status(201).json(user);
});

router.put("/:id", authenticate, authorize("ADMIN"), validate(updateUserSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data: any = { ...req.body };
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, active: true },
  });
  return res.json(user);
});

export default router;

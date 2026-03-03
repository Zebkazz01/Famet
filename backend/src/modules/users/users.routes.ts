import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authenticate, authorize } from "../../middleware/auth";
import { prisma } from "../../config/database";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

function generateRecoveryCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// --- Schemas ---

const createUserSchema = z.object({
  cedula: z.string().min(5, "Cédula mínimo 5 caracteres"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  phone: z.string().optional().default(""),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  username: z.string().min(3, "Usuario mínimo 3 caracteres"),
  password: z.string().min(4, "Contraseña mínimo 4 caracteres"),
  role: z.enum(["ADMIN", "CASHIER"]).default("CASHIER"),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(4).optional(),
  role: z.enum(["ADMIN", "CASHIER"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "DISABLED"]).optional(),
});

const recoverSchema = z.object({
  cedula: z.string().min(5),
  recoveryCode: z.string().min(1),
  newPassword: z.string().min(4),
});

// --- Rutas Admin ---

// Listar todos los usuarios
router.get("/", authenticate, authorize("ADMIN"), async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, cedula: true, firstName: true, lastName: true,
      phone: true, email: true, username: true, role: true,
      status: true, recoveryCode: true, createdAt: true,
    },
    orderBy: { firstName: "asc" },
  });
  return res.json(users);
});

// Crear usuario (admin)
router.post("/", authenticate, authorize("ADMIN"), validate(createUserSchema), async (req: Request, res: Response) => {
  const { cedula, firstName, lastName, phone, email, username, password, role } = req.body;

  const existingCedula = await prisma.user.findUnique({ where: { cedula } });
  if (existingCedula) return res.status(400).json({ error: "Ya existe un usuario con esa cédula" });

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) return res.status(400).json({ error: "El nombre de usuario ya está en uso" });

  const hashed = await bcrypt.hash(password, 10);
  const recoveryCode = generateRecoveryCode();

  const user = await prisma.user.create({
    data: { cedula, firstName, lastName, phone, email, username, password: hashed, role, status: "ACTIVE", recoveryCode },
    select: {
      id: true, cedula: true, firstName: true, lastName: true,
      username: true, role: true, status: true, recoveryCode: true,
    },
  });

  return res.status(201).json(user);
});

// Actualizar usuario (admin)
router.put("/:id", authenticate, authorize("ADMIN"), validate(updateUserSchema), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data: any = { ...req.body };

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, cedula: true, firstName: true, lastName: true,
      phone: true, email: true, username: true, role: true,
      status: true, recoveryCode: true,
    },
  });

  return res.json(user);
});

// Regenerar código de recuperación (admin)
router.post("/:id/regenerate-code", authenticate, authorize("ADMIN"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const recoveryCode = generateRecoveryCode();

  const user = await prisma.user.update({
    where: { id },
    data: { recoveryCode },
    select: { id: true, username: true, recoveryCode: true },
  });

  return res.json(user);
});

// --- Ruta Pública: Recuperar contraseña ---

router.post("/recover", validate(recoverSchema), async (req: Request, res: Response) => {
  const { cedula, recoveryCode, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { cedula } });
  if (!user) return res.status(404).json({ error: "No se encontró usuario con esa cédula" });

  if (user.recoveryCode !== recoveryCode) {
    return res.status(400).json({ error: "Código de recuperación incorrecto" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const newRecoveryCode = generateRecoveryCode();

  await prisma.user.update({
    where: { cedula },
    data: { password: hashed, recoveryCode: newRecoveryCode },
  });

  return res.json({ message: "Contraseña actualizada correctamente" });
});

export default router;

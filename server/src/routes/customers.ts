import { Router } from "express";
import { CustomerStatus, CustomerType, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { pagination } from "../lib/http.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const customersRouter = Router();
const customerSchema = z.object({
  name: z.string().min(2), mobile: z.string().min(7), email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().min(2), gstNumber: z.string().optional(), type: z.nativeEnum(CustomerType),
  address: z.string().min(3), status: z.nativeEnum(CustomerStatus), followUpDate: z.string().datetime().optional().nullable(), notes: z.string().optional()
});

customersRouter.use(authenticate);
customersRouter.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query as { page?: string; limit?: string });
    const search = String(req.query.search || "");
    const where = search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { businessName: { contains: search, mode: "insensitive" as const } }, { mobile: { contains: search } }] } : {};
    const [data, total] = await prisma.$transaction([prisma.customer.findMany({ where, skip, take: limit, orderBy: { updatedAt: "desc" } }), prisma.customer.count({ where })]);
    res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});
customersRouter.post("/", authorize(Role.ADMIN, Role.SALES), async (req, res, next) => {
  try { const input = customerSchema.parse(req.body); const data = await prisma.customer.create({ data: { ...input, email: input.email || null, followUpDate: input.followUpDate ? new Date(input.followUpDate) : null } }); res.status(201).json(data); } catch (error) { next(error); }
});
customersRouter.get("/:id", async (req, res, next) => {
  try { const data = await prisma.customer.findUnique({ where: { id: String(req.params.id) }, include: { followUps: { orderBy: { createdAt: "desc" } }, challans: { orderBy: { createdAt: "desc" }, take: 10 } } }); if (!data) return res.status(404).json({ message: "Customer not found." }); res.json(data); } catch (error) { next(error); }
});
customersRouter.patch("/:id", authorize(Role.ADMIN, Role.SALES), async (req, res, next) => {
  try { const input = customerSchema.partial().parse(req.body); const data = await prisma.customer.update({ where: { id: String(req.params.id) }, data: { ...input, followUpDate: input.followUpDate ? new Date(input.followUpDate) : input.followUpDate === null ? null : undefined } }); res.json(data); } catch (error) { next(error); }
});
customersRouter.post("/:id/follow-ups", authorize(Role.ADMIN, Role.SALES), async (req, res, next) => {
  try { const input = z.object({ note: z.string().min(2), dueDate: z.string().datetime().optional().nullable() }).parse(req.body); const data = await prisma.followUp.create({ data: { customerId: String(req.params.id), note: input.note, dueDate: input.dueDate ? new Date(input.dueDate) : null } }); res.status(201).json(data); } catch (error) { next(error); }
});

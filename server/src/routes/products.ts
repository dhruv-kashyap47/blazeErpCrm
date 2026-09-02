import { MovementType, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { pagination } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const productsRouter = Router();
const productSchema = z.object({ name: z.string().min(2), sku: z.string().min(2), category: z.string().min(2), unitPrice: z.coerce.number().nonnegative(), currentStock: z.coerce.number().int().nonnegative(), minimumStock: z.coerce.number().int().nonnegative(), location: z.string().min(2), isActive: z.boolean().optional() });

productsRouter.use(authenticate);
productsRouter.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query as { page?: string; limit?: string });
    const search = String(req.query.search || "");
    const lowStock = req.query.lowStock === "true";
    const where = search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { sku: { contains: search, mode: "insensitive" as const } }] } : {};
    if (lowStock) {
      const products = await prisma.product.findMany({ where, orderBy: { updatedAt: "desc" } });
      const filtered = products.filter((product) => product.currentStock <= product.minimumStock);
      const data = filtered.slice(skip, skip + limit);
      const normalized = data.map((product) => ({ ...product, isLowStock: true }));
      return res.json({ data: normalized, meta: { page, limit, total: filtered.length, pages: Math.ceil(filtered.length / limit) } });
    }
    const [data, total] = await prisma.$transaction([prisma.product.findMany({ where, skip, take: limit, orderBy: { updatedAt: "desc" } }), prisma.product.count({ where })]);
    const normalized = data.map((product) => ({ ...product, isLowStock: product.currentStock <= product.minimumStock }));
    res.json({ data: normalized, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});
productsRouter.post("/", authorize(Role.ADMIN, Role.WAREHOUSE), async (req, res, next) => {
  try {
    const input = productSchema.parse(req.body);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: input });
      if (input.currentStock > 0) await tx.stockMovement.create({ data: { productId: created.id, quantity: input.currentStock, type: MovementType.IN, reason: "Opening stock", userId: req.user!.id } });
      return created;
    });
    res.status(201).json(product);
  } catch (error) { next(error); }
});
productsRouter.patch("/:id", authorize(Role.ADMIN, Role.WAREHOUSE), async (req, res, next) => {
  try { const input = productSchema.omit({ currentStock: true }).partial().parse(req.body); const data = await prisma.product.update({ where: { id: String(req.params.id) }, data: input }); res.json(data); } catch (error) { next(error); }
});
productsRouter.post("/:id/movements", authorize(Role.ADMIN, Role.WAREHOUSE), async (req, res, next) => {
  try {
    const input = z.object({ quantity: z.coerce.number().int().positive(), type: z.nativeEnum(MovementType), reason: z.string().min(2) }).parse(req.body);
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: String(req.params.id) } });
      if (!existing) throw Object.assign(new Error("Product not found."), { status: 404 });
      const delta = input.type === MovementType.IN ? input.quantity : -input.quantity;
      if (existing.currentStock + delta < 0) throw Object.assign(new Error("Stock cannot become negative."), { status: 409 });
      const updated = await tx.product.update({ where: { id: existing.id }, data: { currentStock: { increment: delta } } });
      await tx.stockMovement.create({ data: { productId: existing.id, quantity: input.quantity, type: input.type, reason: input.reason, userId: req.user!.id } });
      return updated;
    });
    res.status(201).json(product);
  } catch (error) { next(error); }
});
productsRouter.get("/:id/movements", async (req, res, next) => {
  try { const data = await prisma.stockMovement.findMany({ where: { productId: String(req.params.id) }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } }); res.json(data); } catch (error) { next(error); }
});

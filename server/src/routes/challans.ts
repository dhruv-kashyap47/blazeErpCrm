import { ChallanStatus, MovementType, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { pagination } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const challansRouter = Router();
const challanSchema = z.object({ customerId: z.string().min(1), status: z.enum([ChallanStatus.DRAFT, ChallanStatus.CONFIRMED]).default(ChallanStatus.DRAFT), items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive() })).min(1) });
const include = { customer: { select: { name: true, businessName: true } }, createdBy: { select: { name: true, role: true } }, items: true } as const;
const numberFor = () => `SC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

async function confirmChallan(challanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id: challanId }, include: { items: true } });
    if (!challan) throw Object.assign(new Error("Challan not found."), { status: 404 });
    if (challan.status !== ChallanStatus.DRAFT) throw Object.assign(new Error("Only draft challans can be confirmed."), { status: 409 });
    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.currentStock < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${item.productName}.`), { status: 409 });
      await tx.product.update({ where: { id: product.id }, data: { currentStock: { decrement: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: product.id, quantity: item.quantity, type: MovementType.OUT, reason: `Sales challan ${challan.challanNumber}`, userId } });
    }
    return tx.challan.update({ where: { id: challanId }, data: { status: ChallanStatus.CONFIRMED }, include });
  }, { isolationLevel: "Serializable" });
}

challansRouter.use(authenticate);
challansRouter.get("/", async (req, res, next) => {
  try { const { page, limit, skip } = pagination(req.query as { page?: string; limit?: string }); const data = await prisma.challan.findMany({ skip, take: limit, include, orderBy: { createdAt: "desc" } }); const total = await prisma.challan.count(); res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } }); } catch (error) { next(error); }
});
challansRouter.get("/:id", async (req, res, next) => {
  try { const data = await prisma.challan.findUnique({ where: { id: String(req.params.id) }, include }); if (!data) return res.status(404).json({ message: "Challan not found." }); res.json(data); } catch (error) { next(error); }
});
challansRouter.post("/", authorize(Role.ADMIN, Role.SALES), async (req, res, next) => {
  try {
    const input = challanSchema.parse(req.body);
    const products = await prisma.product.findMany({ where: { id: { in: input.items.map((item) => item.productId) }, isActive: true } });
    if (products.length !== input.items.length) return res.status(422).json({ message: "One or more selected products are unavailable." });
    const data = await prisma.challan.create({ data: { challanNumber: numberFor(), customerId: input.customerId, status: ChallanStatus.DRAFT, totalQuantity: input.items.reduce((sum, item) => sum + item.quantity, 0), createdById: req.user!.id, items: { create: input.items.map((item) => { const product = products.find((candidate) => candidate.id === item.productId)!; return { productId: product.id, productName: product.name, sku: product.sku, unitPrice: product.unitPrice, quantity: item.quantity }; }) } }, include });
    if (input.status === ChallanStatus.CONFIRMED) return res.status(201).json(await confirmChallan(data.id, req.user!.id));
    return res.status(201).json(data);
  } catch (error) { next(error); }
});
challansRouter.post("/:id/confirm", authorize(Role.ADMIN, Role.SALES), async (req, res, next) => { try { res.json(await confirmChallan(String(req.params.id), req.user!.id)); } catch (error) { next(error); } });
challansRouter.post("/:id/cancel", authorize(Role.ADMIN, Role.SALES), async (req, res, next) => { try { const data = await prisma.challan.update({ where: { id: String(req.params.id) }, data: { status: ChallanStatus.CANCELLED }, include }); res.json(data); } catch (error) { next(error); } });

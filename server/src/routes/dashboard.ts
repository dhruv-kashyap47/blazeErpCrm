import { ChallanStatus } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [customerCount, productCount, products, challanCount, recentChallans, followUps, movements] = await Promise.all([
      prisma.customer.count(), prisma.product.count(), prisma.product.findMany({ orderBy: { currentStock: "asc" } }), prisma.challan.count(),
      prisma.challan.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } }),
      prisma.customer.findMany({ where: { followUpDate: { lte: new Date(today.getTime() + 7 * 86400000) } }, orderBy: { followUpDate: "asc" }, take: 5 }),
      prisma.stockMovement.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } }, user: { select: { name: true } } } })
    ]);
    res.json({ metrics: { customerCount, productCount, challanCount, lowStockCount: products.filter((p) => p.currentStock <= p.minimumStock).length }, lowStock: products.filter((p) => p.currentStock <= p.minimumStock).slice(0, 5), recentChallans, followUps, recentActivity: movements });
  } catch (error) { next(error); }
});

import { PrismaClient, CustomerStatus, CustomerType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Blaze@123", 10);
  const users = await Promise.all([
    ["Aarav Mehta", "admin@blaze.local", Role.ADMIN], ["Nisha Sharma", "sales@blaze.local", Role.SALES], ["Kabir Khan", "warehouse@blaze.local", Role.WAREHOUSE], ["Riya Patel", "accounts@blaze.local", Role.ACCOUNTS]
  ].map(([name, email, role]) => prisma.user.upsert({ where: { email: email as string }, update: {}, create: { name: name as string, email: email as string, role: role as Role, passwordHash } })));
  const customer = await prisma.customer.upsert({ where: { id: "demo-customer" }, update: {}, create: { id: "demo-customer", name: "Sonal Gupta", mobile: "9876543210", email: "sonal@urbanmart.in", businessName: "Urban Mart", type: CustomerType.WHOLESALE, address: "Andheri East, Mumbai", status: CustomerStatus.ACTIVE, followUpDate: new Date(Date.now() + 86400000), notes: "Prefers weekly dispatches." } });
  const samples = [["Turmeric Powder 500g", "SPC-TUR-500", "Spices", 165, 46, 20, "A-03"], ["Basmati Rice 5kg", "GRN-BAS-5", "Grains", 890, 12, 15, "B-12"], ["Cold Pressed Mustard Oil", "OIL-MUS-1", "Oils", 230, 61, 25, "C-07"]] as const;
  for (const [name, sku, category, unitPrice, currentStock, minimumStock, location] of samples) await prisma.product.upsert({ where: { sku }, update: {}, create: { name, sku, category, unitPrice, currentStock, minimumStock, location } });
  await prisma.followUp.upsert({ where: { id: "demo-followup" }, update: {}, create: { id: "demo-followup", customerId: customer.id, note: "Confirm the upcoming rice order.", dueDate: new Date(Date.now() + 86400000) } });
  console.log("Seed complete. Password for all accounts: Blaze@123");
  void users;
}
main().finally(() => prisma.$disconnect());

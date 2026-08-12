import { PrismaClient, CustomerType, CustomerStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password@123", 10);

  const [admin, sales, warehouse, accounts] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@erp.test" },
      update: {},
      create: { name: "Aditi Admin", email: "admin@erp.test", passwordHash: password, role: "ADMIN" },
    }),
    prisma.user.upsert({
      where: { email: "sales@erp.test" },
      update: {},
      create: { name: "Sanjay Sales", email: "sales@erp.test", passwordHash: password, role: "SALES" },
    }),
    prisma.user.upsert({
      where: { email: "warehouse@erp.test" },
      update: {},
      create: { name: "Waris Warehouse", email: "warehouse@erp.test", passwordHash: password, role: "WAREHOUSE" },
    }),
    prisma.user.upsert({
      where: { email: "accounts@erp.test" },
      update: {},
      create: { name: "Anita Accounts", email: "accounts@erp.test", passwordHash: password, role: "ACCOUNTS" },
    }),
  ]);

  const customer = await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Rohit Traders",
      mobile: "9876543210",
      email: "rohit@traders.example",
      businessName: "Rohit Traders Pvt Ltd",
      customerType: CustomerType.WHOLESALE,
      address: "MG Road, Ahmedabad",
      status: CustomerStatus.ACTIVE,
      createdById: sales.id,
    },
  });

  const product = await prisma.product.upsert({
    where: { sku: "SKU-STEEL-001" },
    update: {},
    create: {
      name: "Steel Rod 12mm",
      sku: "SKU-STEEL-001",
      category: "Construction",
      unitPrice: 650,
      currentStock: 500,
      minStockAlert: 50,
      location: "Warehouse A - Rack 3",
      createdById: warehouse.id,
    },
  });

  console.log("Seed complete.");
  console.log("Login credentials (all use password: Password@123):");
  console.log(`  Admin:     admin@erp.test`);
  console.log(`  Sales:     sales@erp.test`);
  console.log(`  Warehouse: warehouse@erp.test`);
  console.log(`  Accounts:  accounts@erp.test`);
  console.log(`Sample customer: ${customer.name} (${customer.id})`);
  console.log(`Sample product: ${product.name} (${product.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

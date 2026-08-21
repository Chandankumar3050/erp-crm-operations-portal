import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [warehouseA, warehouseB] = await Promise.all([
    prisma.location.upsert({
      where: { name: "Warehouse A - Vadodara" },
      update: {},
      create: { name: "Warehouse A - Vadodara" },
    }),
    prisma.location.upsert({
      where: { name: "Warehouse B - Ahmedabad" },
      update: {},
      create: { name: "Warehouse B - Ahmedabad" },
    }),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@fundsroom.test" },
    update: {},
    create: { name: "Admin User", email: "admin@fundsroom.test", passwordHash, role: Role.ADMIN },
  });

  const opsUser = await prisma.user.upsert({
    where: { email: "ops@fundsroom.test" },
    update: {},
    create: {
      name: "Operations User",
      email: "ops@fundsroom.test",
      passwordHash,
      role: Role.OPERATIONS,
      locationId: warehouseA.id,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: "sales@fundsroom.test" },
    update: {},
    create: {
      name: "Sales User",
      email: "sales@fundsroom.test",
      passwordHash,
      role: Role.SALES,
      locationId: warehouseA.id,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { name_locationId_batch: { name: "Steel Rod 10mm", locationId: warehouseA.id, batch: "BATCH-A1" } },
    update: {},
    create: {
      name: "Steel Rod 10mm",
      category: "Raw Material",
      locationId: warehouseA.id,
      batch: "BATCH-A1",
      physicalQty: 100,
      reservedQty: 0,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { name_locationId_batch: { name: "Steel Rod 10mm", locationId: warehouseB.id, batch: "BATCH-B1" } },
    update: {},
    create: {
      name: "Steel Rod 10mm",
      category: "Raw Material",
      locationId: warehouseB.id,
      batch: "BATCH-B1",
      physicalQty: 80,
      reservedQty: 0,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { name_locationId_batch: { name: "Copper Wire Spool", locationId: warehouseA.id, batch: "BATCH-CW1" } },
    update: {},
    create: {
      name: "Copper Wire Spool",
      category: "Raw Material",
      locationId: warehouseA.id,
      batch: "BATCH-CW1",
      physicalQty: 60,
      reservedQty: 0,
    },
  });

  await prisma.workOrder.create({
    data: {
      locationId: warehouseA.id,
      itemName: "Copper Wire Spool",
      requiredQty: 100,
      assignedUserId: opsUser.id,
      status: "ASSIGNED",
    },
  });

  console.log("Seed complete.");
  console.log({ admin: admin.email, opsUser: opsUser.email, salesUser: salesUser.email });
  console.log("All seeded users share password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

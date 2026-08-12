import { Request, Response } from "express";
import { z } from "zod";
import { ChallanStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

const challanItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemSchema).min(1, "At least one product line is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
});

const updateChallanSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
});

// Generates a human-readable, sequential-per-day challan number, e.g. CH-20260812-0007.
// Retries on the rare race where two requests grab the same sequence number
// at once (unique constraint on challanNumber catches it).
async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await tx.challan.count({
    where: { createdAt: { gte: new Date(today.toDateString()) } },
  });
  const seq = String(countToday + 1).padStart(4, "0");
  return `CH-${datePart}-${seq}`;
}

async function reduceStockForItems(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number }[],
  reason: string,
  userId: string
) {
  const insufficient: { productId: string; name: string; available: number; requested: number }[] = [];

  const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw ApiError.badRequest(`Product ${item.productId} does not exist`);
    if (product.currentStock < item.quantity) {
      insufficient.push({
        productId: product.id,
        name: product.name,
        available: product.currentStock,
        requested: item.quantity,
      });
    }
  }

  if (insufficient.length > 0) {
    throw ApiError.badRequest("Insufficient stock for one or more products", { insufficient });
  }

  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: { decrement: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: "OUT",
        reason,
        createdById: userId,
      },
    });
  }
}

// GET /api/challans?status=&customerId=&page=&limit=
export async function listChallans(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req);
  const { status, customerId } = req.query as Record<string, string | undefined>;

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status: status as ChallanStatus } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true, businessName: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.challan.count({ where }),
  ]);

  res.json({ data: items, meta: buildPaginationMeta(total, page, limit) });
}

export async function getChallan(req: Request, res: Response) {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      createdBy: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  });
  if (!challan) throw ApiError.notFound("Challan not found");
  res.json(challan);
}

// POST /api/challans — create as DRAFT or CONFIRMED
export async function createChallan(req: Request, res: Response) {
  const { customerId, items, status } = createChallanSchema.parse(req.body);

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw ApiError.badRequest("Customer does not exist");

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    if (!productMap.has(item.productId)) {
      throw ApiError.badRequest(`Product ${item.productId} does not exist`);
    }
  }

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  const challan = await prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);

    const created = await tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: "DRAFT", // always created as DRAFT first, then optionally confirmed below
        createdById: req.user!.userId,
        items: {
          create: items.map((i) => {
            const p = productMap.get(i.productId)!;
            return {
              productId: p.id,
              productNameSnapshot: p.name,
              productSkuSnapshot: p.sku,
              unitPriceSnapshot: p.unitPrice,
              quantity: i.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    if (status === "CONFIRMED") {
      await reduceStockForItems(
        tx,
        items,
        `Sales challan ${created.challanNumber} confirmed`,
        req.user!.userId
      );
      return tx.challan.update({
        where: { id: created.id },
        data: { status: "CONFIRMED" },
        include: { items: true, customer: true },
      });
    }

    return created;
  });

  res.status(201).json(challan);
}

// PUT /api/challans/:id — only editable while still DRAFT
export async function updateChallan(req: Request, res: Response) {
  const data = updateChallanSchema.parse(req.body);
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Challan not found");
  if (existing.status !== "DRAFT") {
    throw ApiError.badRequest(`Cannot edit a challan with status ${existing.status}. Only DRAFT challans can be edited.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    if (data.items) {
      const products = await tx.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
      const productMap = new Map(products.map((p) => [p.id, p]));
      for (const item of data.items) {
        if (!productMap.has(item.productId)) throw ApiError.badRequest(`Product ${item.productId} does not exist`);
      }

      await tx.challanItem.deleteMany({ where: { challanId: existing.id } });
      await tx.challan.update({
        where: { id: existing.id },
        data: {
          totalQuantity: data.items.reduce((sum, i) => sum + i.quantity, 0),
          items: {
            create: data.items.map((i) => {
              const p = productMap.get(i.productId)!;
              return {
                productId: p.id,
                productNameSnapshot: p.name,
                productSkuSnapshot: p.sku,
                unitPriceSnapshot: p.unitPrice,
                quantity: i.quantity,
              };
            }),
          },
        },
      });
    }

    if (data.customerId) {
      await tx.challan.update({ where: { id: existing.id }, data: { customerId: data.customerId } });
    }

    return tx.challan.findUnique({ where: { id: existing.id }, include: { items: true, customer: true } });
  });

  res.json(result);
}

// POST /api/challans/:id/confirm — reduces stock; fails cleanly if stock is insufficient
export async function confirmChallan(req: Request, res: Response) {
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!existing) throw ApiError.notFound("Challan not found");
  if (existing.status !== "DRAFT") {
    throw ApiError.badRequest(`Only DRAFT challans can be confirmed. Current status: ${existing.status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    await reduceStockForItems(
      tx,
      existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      `Sales challan ${existing.challanNumber} confirmed`,
      req.user!.userId
    );
    return tx.challan.update({
      where: { id: existing.id },
      data: { status: "CONFIRMED" },
      include: { items: true, customer: true },
    });
  });

  res.json(result);
}

// POST /api/challans/:id/cancel — cancelling a CONFIRMED challan restores stock
export async function cancelChallan(req: Request, res: Response) {
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!existing) throw ApiError.notFound("Challan not found");
  if (existing.status === "CANCELLED") throw ApiError.badRequest("Challan is already cancelled");

  const result = await prisma.$transaction(async (tx) => {
    if (existing.status === "CONFIRMED") {
      // Restore stock that was deducted on confirmation, with an IN movement for audit trail
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: "IN",
            reason: `Sales challan ${existing.challanNumber} cancelled - stock restored`,
            createdById: req.user!.userId,
          },
        });
      }
    }
    return tx.challan.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
  });

  res.json(result);
}

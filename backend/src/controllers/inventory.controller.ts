import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

const prisma = new PrismaClient();

function serializeItem(item: {
  id: string;
  name: string;
  category: string;
  locationId: string;
  batch: string;
  physicalQty: number;
  reservedQty: number;
}) {
  return {
    ...item,
    availableQty: item.physicalQty - item.reservedQty,
  };
}

export async function listInventory(req: Request, res: Response) {
  const { locationId } = req.query;

  const items = await prisma.inventoryItem.findMany({
    where: locationId ? { locationId: String(locationId) } : undefined,
    include: { location: true },
    orderBy: { name: "asc" },
  });

  res.json({ items: items.map(serializeItem) });
}

export async function getInventoryItem(req: Request, res: Response) {
  const { id } = req.params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { location: true },
  });
  if (!item) throw ApiError.notFound("Inventory item not found");
  res.json({ item: serializeItem(item) });
}

export async function createInventoryItem(req: Request, res: Response) {
  const { name, category, locationId, batch, physicalQty } = req.body;

  if (!name || !category || !locationId || !batch) {
    throw ApiError.badRequest("name, category, locationId, and batch are required");
  }
  if (typeof physicalQty !== "number" || physicalQty < 0 || !Number.isInteger(physicalQty)) {
    throw ApiError.badRequest("physicalQty must be a non-negative integer");
  }

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw ApiError.badRequest("Invalid locationId");

  try {
    const item = await prisma.inventoryItem.create({
      data: { name, category, locationId, batch, physicalQty, reservedQty: 0 },
    });
    res.status(201).json({ item: serializeItem(item) });
  } catch (err: any) {
    if (err.code === "P2002") {
      throw ApiError.conflict("An inventory item with this name, location, and batch already exists");
    }
    throw err;
  }
}

export async function adjustPhysicalStock(req: Request, res: Response) {
  const { id } = req.params;
  const { delta, reason } = req.body;

  if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
    throw ApiError.badRequest("delta must be a non-zero integer");
  }
  if (!reason) throw ApiError.badRequest("reason is required for an audit trail");

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.inventoryItem.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound("Inventory item not found");

    const newPhysical = current.physicalQty + delta;
    if (newPhysical < 0) {
      throw ApiError.conflict("Adjustment would make physical quantity negative");
    }
    if (newPhysical < current.reservedQty) {
      throw ApiError.conflict(
        `Cannot reduce physical stock below reserved quantity (${current.reservedQty} already reserved)`
      );
    }

    return tx.inventoryItem.update({
      where: { id },
      data: { physicalQty: newPhysical },
    });
  });

  res.json({ item: serializeItem(updated) });
}

export async function reserveStock(itemId: string, qty: number) {
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0) {
    throw ApiError.badRequest("Reservation quantity must be a positive integer");
  }

  return prisma.$transaction(async (tx) => {
    const affected = await tx.$executeRaw`
      UPDATE "inventory_items"
      SET "reservedQty" = "reservedQty" + ${qty}
      WHERE "id" = ${itemId}
        AND ("physicalQty" - "reservedQty") >= ${qty}
    `;

    if (affected === 0) {
      const exists = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!exists) throw ApiError.notFound("Inventory item not found");
      throw ApiError.conflict("Insufficient available stock to reserve this quantity");
    }

    return tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
  });
}

export async function releaseStock(itemId: string, qty: number) {
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0) {
    throw ApiError.badRequest("Release quantity must be a positive integer");
  }

  return prisma.$transaction(async (tx) => {
    const affected = await tx.$executeRaw`
      UPDATE "inventory_items"
      SET "reservedQty" = "reservedQty" - ${qty}
      WHERE "id" = ${itemId}
        AND "reservedQty" >= ${qty}
    `;

    if (affected === 0) {
      const exists = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!exists) throw ApiError.notFound("Inventory item not found");
      throw ApiError.conflict("Cannot release more than is currently reserved");
    }

    return tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
  });
}

export async function reserveStockHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { qty } = req.body;
  const item = await reserveStock(id, qty);
  res.json({ item: serializeItem(item) });
}

import { Request, Response } from "express";
import { z } from "zod";
import { MovementType, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative().optional(),
  minStockAlert: z.coerce.number().int().nonnegative().optional(),
  location: z.string().optional(),
});

const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1, "Reason is required"),
});

// GET /api/products?search=&lowStock=true&page=&limit=
export async function listProducts(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req);
  const { search, lowStock } = req.query as Record<string, string | undefined>;

  const where: Prisma.ProductWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [allMatching, total] = await Promise.all([
    lowStock === "true"
      ? prisma.product.findMany({ where, orderBy: { createdAt: "desc" } })
      : prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.product.count({ where }),
  ]);

  // Low-stock filter compares two columns, which Prisma can't express directly
  // in `where`, so it's applied in memory on the (small) result set.
  const items =
    lowStock === "true"
      ? allMatching.filter((p) => p.currentStock <= p.minStockAlert).slice(skip, skip + limit)
      : allMatching;

  res.json({ data: items, meta: buildPaginationMeta(total, page, limit) });
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound("Product not found");
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: { ...data, createdById: req.user!.userId },
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const data = productSchema.partial().omit({ currentStock: true }).parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Product not found");

  // currentStock is intentionally NOT editable here - it only changes via
  // stock movements or confirmed challans, so the audit trail stays complete.
  const product = await prisma.product.update({ where: { id: req.params.id }, data });
  res.json(product);
}

// POST /api/products/:id/stock-movement — manual IN/OUT adjustment
export async function addStockMovement(req: Request, res: Response) {
  const { quantity, movementType, reason } = stockMovementSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw ApiError.notFound("Product not found");

    const newStock =
      movementType === "IN" ? product.currentStock + quantity : product.currentStock - quantity;

    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock. Current stock: ${product.currentStock}, requested OUT: ${quantity}`
      );
    }

    const updated = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged: quantity,
        movementType,
        reason,
        createdById: req.user!.userId,
      },
    });

    return { product: updated, movement };
  });

  res.status(201).json(result);
}

export async function getStockLog(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req);
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound("Product not found");

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId: product.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.stockMovement.count({ where: { productId: product.id } }),
  ]);

  res.json({ data: items, meta: buildPaginationMeta(total, page, limit) });
}

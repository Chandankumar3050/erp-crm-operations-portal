import { Request, Response } from "express";
import { z } from "zod";
import { CustomerStatus, CustomerType, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(6, "Mobile number looks too short"),
  email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.nativeEnum(CustomerType),
  address: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const noteSchema = z.object({
  note: z.string().min(1, "Note text is required"),
});

// GET /api/customers?search=&status=&customerType=&page=&limit=
export async function listCustomers(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req);
  const { search, status, customerType } = req.query as Record<string, string | undefined>;

  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status: status as CustomerStatus } : {}),
    ...(customerType ? { customerType: customerType as CustomerType } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { businessName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({ data: items, meta: buildPaginationMeta(total, page, limit) });
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      followUpNotes: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      challans: { orderBy: { createdAt: "desc" }, take: 10 },
      createdBy: { select: { name: true } },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  res.json(customer);
}

export async function createCustomer(req: Request, res: Response) {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({
    data: { ...data, email: data.email || undefined, createdById: req.user!.userId },
  });
  res.status(201).json(customer);
}

export async function updateCustomer(req: Request, res: Response) {
  const data = customerSchema.partial().parse(req.body);
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound("Customer not found");

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { ...data, email: data.email === "" ? undefined : data.email },
  });
  res.json(customer);
}

export async function addFollowUpNote(req: Request, res: Response) {
  const { note } = noteSchema.parse(req.body);
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) throw ApiError.notFound("Customer not found");

  const created = await prisma.followUpNote.create({
    data: { customerId: customer.id, note, createdById: req.user!.userId },
  });
  res.status(201).json(created);
}

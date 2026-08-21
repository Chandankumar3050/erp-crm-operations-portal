import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  listInventory,
  getInventoryItem,
  createInventoryItem,
  adjustPhysicalStock,
  reserveStockHandler,
} from "../controllers/inventory.controller";

const router = Router();
router.use(requireAuth);

router.get("/", listInventory);
router.get("/:id", getInventoryItem);

router.post("/", requireRole("ADMIN", "OPERATIONS"), createInventoryItem);
router.post("/:id/adjust", requireRole("ADMIN", "OPERATIONS"), adjustPhysicalStock);
router.post("/:id/reserve", requireRole("ADMIN", "SALES"), reserveStockHandler);

export default router;

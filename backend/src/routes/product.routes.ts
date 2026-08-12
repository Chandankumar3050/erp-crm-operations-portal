import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  addStockMovement,
  getStockLog,
} from "../controllers/product.controller";

const router = Router();

router.use(requireAuth);

// Everyone can view products/stock (sales needs it for challans, accounts for reporting)
router.get("/", listProducts);
router.get("/:id", getProduct);
router.get("/:id/stock-log", getStockLog);

// Only Admin and Warehouse manage the catalog and stock
router.post("/", requireRole("ADMIN", "WAREHOUSE"), createProduct);
router.put("/:id", requireRole("ADMIN", "WAREHOUSE"), updateProduct);
router.post("/:id/stock-movement", requireRole("ADMIN", "WAREHOUSE"), addStockMovement);

export default router;

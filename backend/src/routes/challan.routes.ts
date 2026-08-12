import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  listChallans,
  getChallan,
  createChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from "../controllers/challan.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listChallans);
router.get("/:id", getChallan);

// Sales creates and edits challans; Warehouse confirms (they own stock accuracy);
// Admin can do everything.
router.post("/", requireRole("ADMIN", "SALES"), createChallan);
router.put("/:id", requireRole("ADMIN", "SALES"), updateChallan);
router.post("/:id/confirm", requireRole("ADMIN", "SALES", "WAREHOUSE"), confirmChallan);
router.post("/:id/cancel", requireRole("ADMIN", "WAREHOUSE"), cancelChallan);

export default router;

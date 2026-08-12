import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
} from "../controllers/customer.controller";

const router = Router();

router.use(requireAuth);

// Everyone logged in can view customers (sales, warehouse for challan context, accounts, admin)
router.get("/", listCustomers);
router.get("/:id", getCustomer);

// Only Admin and Sales can create/edit customers and log follow-ups
router.post("/", requireRole("ADMIN", "SALES"), createCustomer);
router.put("/:id", requireRole("ADMIN", "SALES"), updateCustomer);
router.post("/:id/notes", requireRole("ADMIN", "SALES"), addFollowUpNote);

export default router;

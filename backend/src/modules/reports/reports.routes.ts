import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  salesReport, financialReport, expensesReport, inventoryReport,
  closeMonth, listStatements, getStatement, getStatementPdf,
} from "./reports.controller";

const router = Router();

router.get("/sales", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(salesReport));
router.get("/financial", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(financialReport));
router.get("/expenses", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(expensesReport));
router.get("/inventory", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(inventoryReport));

router.post("/monthly-close", authenticate, authorize("ADMIN"), asyncHandler(closeMonth));
router.get("/monthly-statements", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(listStatements));
router.get("/monthly-statements/:month", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getStatement));
router.get("/monthly-statements/:month/pdf", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getStatementPdf));

export default router;

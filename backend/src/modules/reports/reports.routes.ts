import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  salesReport, financialReport, expensesReport, inventoryReport,
  closeMonth, listStatements, getStatement, getStatementPdf,
} from "./reports.controller";

const router = Router();

router.get("/sales", authenticate, authorize("ADMIN", "SUPERVISOR"), salesReport);
router.get("/financial", authenticate, authorize("ADMIN", "SUPERVISOR"), financialReport);
router.get("/expenses", authenticate, authorize("ADMIN", "SUPERVISOR"), expensesReport);
router.get("/inventory", authenticate, authorize("ADMIN", "SUPERVISOR"), inventoryReport);

router.post("/monthly-close", authenticate, authorize("ADMIN"), closeMonth);
router.get("/monthly-statements", authenticate, authorize("ADMIN", "SUPERVISOR"), listStatements);
router.get("/monthly-statements/:month", authenticate, authorize("ADMIN", "SUPERVISOR"), getStatement);
router.get("/monthly-statements/:month/pdf", authenticate, authorize("ADMIN", "SUPERVISOR"), getStatementPdf);

export default router;

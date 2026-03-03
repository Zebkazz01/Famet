import { Router, Request, Response } from "express";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../config/database";
import { generateTicketPdf } from "../../pdf/pdfGenerator";

const router = Router();

router.get("/:id/ticket", authenticate, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });

  if (!sale) return res.status(404).json({ error: "Venta no encontrada" });

  const pdf = await generateTicketPdf(sale);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=ticket-${id}.pdf`);
  return res.send(pdf);
});

export default router;

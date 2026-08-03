let serverApp: any;

try {
  serverApp = require("../backend/dist/app").default;
} catch (e: any) {
  const detail = String(e?.message || e).slice(0, 600);
  serverApp = (_req: any, res: any) => {
    res.status(503).json({
      error: "El servidor no pudo iniciarse. Verifica las variables de entorno (DATABASE_URL, DIRECT_URL, JWT_SECRET) en Vercel.",
      detail,
    });
  };
}

export default serverApp;

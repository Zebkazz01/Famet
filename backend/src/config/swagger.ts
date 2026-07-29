import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { log } from "./logger";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Famet POS API",
      version: "1.3.0",
      description: "API del sistema punto de venta Famet",
    },
    servers: [{ url: "/api" }],
  },
  apis: ["./src/modules/**/*.routes.ts", "./src/modules/**/*.ts"],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customSiteTitle: "Famet POS API Docs",
  }));
  log.info("[swagger] documentación disponible en /api/docs");
}

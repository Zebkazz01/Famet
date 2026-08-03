import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "FAMEAT POS API",
      version: "1.3.0",
      description:
        "API del sistema de punto de venta para carnicerías y negocios que manejan productos por peso.",
      contact: { name: "Zebkazz01", url: "https://github.com/Zebkazz01" },
      license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
    },
    servers: [
      { url: "http://localhost:3001", description: "Local" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "admin" },
            password: { type: "string", example: "admin123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                role: { type: "string", enum: ["ADMIN", "SUPERVISOR", "VENDEDOR"] },
              },
            },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            price: { type: "string" },
            stockQty: { type: "string" },
            saleType: { type: "string", enum: ["UNIT", "WEIGHT", "BOTH"] },
            weightUnit: { type: "string" },
            category: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                color: { type: "string" },
              },
            },
          },
        },
        SaleItem: {
          type: "object",
          required: ["productId", "quantity", "unitPrice"],
          properties: {
            productId: { type: "integer" },
            quantity: { type: "number", minimum: 0.001 },
            unitPrice: { type: "number", minimum: 0.01 },
            isSubUnit: { type: "boolean", default: false },
            skipDiscount: { type: "boolean" },
          },
        },
        CreateSaleRequest: {
          type: "object",
          required: ["items", "paymentMethod", "amountPaid"],
          properties: {
            items: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/SaleItem" },
            },
            paymentMethod: { type: "string", enum: ["CASH", "CARD", "TRANSFER"] },
            amountPaid: { type: "number", minimum: 0 },
            isCredit: { type: "boolean", default: false },
            customerId: { type: "integer" },
            dueDate: { type: "string", format: "date" },
          },
        },
        CashMovement: {
          type: "object",
          required: ["type", "amount", "reason"],
          properties: {
            type: { type: "string", enum: ["CASH_IN", "CASH_OUT"] },
            amount: { type: "number", minimum: 0.01 },
            reason: { type: "string" },
            source: { type: "string", default: "MANUAL" },
          },
        },
        InventoryMovement: {
          type: "object",
          required: ["type", "productId", "quantity"],
          properties: {
            type: { type: "string", enum: ["ENTRY", "EXIT", "ADJUSTMENT", "LOSS", "RETURN"] },
            productId: { type: "integer" },
            quantity: { type: "number" },
            reason: { type: "string" },
            batchId: { type: "integer" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "FAMEAT POS — API Docs",
    })
  );

  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

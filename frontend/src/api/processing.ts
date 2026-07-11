import client from './client';

export interface ProcessingOutputItem {
  productId: number;
  weightKg: number;
  costPerKg?: number;
  salePricePerKg?: number | null;
}

export interface ProcessingBatch {
  id: number;
  code: string;
  animalType: string;
  inputProductId: number;
  inputWeightKg: number;
  totalCost: number;
  wasteWeightKg: number;
  notes: string | null;
  status: string;
  processedBy: number;
  completedAt: string | null;
  createdAt: string;
  inputProduct: { id: number; name: string; stockQty?: number };
  processor: { id: number; firstName: string; lastName: string };
  outputs: ProcessingOutput[];
  totalOutputWeight?: number;
  totalAssignedCost?: number;
}

export interface ProcessingOutput {
  id: number;
  batchId: number;
  productId: number;
  weightKg: number;
  costPerKg: number;
  totalCost: number;
  salePricePerKg: number | null;
  product: { id: number; name: string; sku: string | null; stockQty: number; cost: number | null; price: number; saleType: string };
}

export interface AnalysisResult {
  code: string;
  status: string;
  animalType: string;
  totalInvested: number;
  totalOutputWeight: number;
  wasteKg: number;
  costPerKgUniform: number;
  cuts: CutAnalysis[];
  recovery: RecoveryInfo;
  completedAt: string | null;
  createdAt: string;
}

export interface CutAnalysis {
  productId: number;
  productName: string;
  weightKg: number;
  costPerKg: number;
  totalCost: number;
  salePrice: number;
  stockQty: number;
  soldQty: number;
  margin: number;
}

export interface RecoveryInfo {
  soldCost: number;
  recoveredRevenue: number;
  recoveryPct: number;
  remainingStockCost: number;
  remainingStockRevenue: number;
  expectedProfit: number;
}

export interface DashboardSummary {
  month: string;
  activeBatches: number;
  totalInvested: number;
  totalOutputWeight: number;
  totalRecoveredCost: number;
  totalRecoveredRevenue: number;
  recoveryPct: number;
  pendingRecovery: number;
}

export async function list(params?: { status?: string; animalType?: string }) {
  const res = await client.get('/processing', { params });
  return res.data as ProcessingBatch[];
}

export async function getOne(id: number) {
  const res = await client.get(`/processing/${id}`);
  return res.data as ProcessingBatch;
}

export async function create(data: {
  animalType: string;
  inputProductId: number;
  inputWeightKg: number;
  totalCost: number;
  wasteWeightKg?: number;
  notes?: string | null;
  outputs: ProcessingOutputItem[];
}) {
  const res = await client.post('/processing', data);
  return res.data as ProcessingBatch;
}

export async function update(id: number, data: Partial<{
  animalType: string;
  inputWeightKg: number;
  totalCost: number;
  wasteWeightKg: number;
  notes: string | null;
  outputs: ProcessingOutputItem[];
}>) {
  const res = await client.put(`/processing/${id}`, data);
  return res.data as ProcessingBatch;
}

export async function complete(id: number) {
  const res = await client.post(`/processing/${id}/complete`);
  return res.data as ProcessingBatch;
}

export async function cancel(id: number) {
  const res = await client.post(`/processing/${id}/cancel`);
  return res.data as ProcessingBatch;
}

export async function remove(id: number) {
  const res = await client.delete(`/processing/${id}`);
  return res.data;
}

export async function getAnalysis(id: number) {
  const res = await client.get(`/processing/${id}/analysis`);
  return res.data as AnalysisResult;
}

export async function getSummary() {
  const res = await client.get('/processing/summary');
  return res.data as DashboardSummary;
}

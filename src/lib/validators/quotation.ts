import { z } from "zod";

export const quotationItemSchema = z.object({
  itemNumber: z.number().int().min(1),
  description: z.string().min(1, "請輸入項目名稱"),
  specification: z.string().optional(),
  quantity: z.number().int().min(0).default(1),
  unit: z.string().optional(),
  unitPrice: z.number().int().min(0).default(0),
  amount: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
});

export const quotationServiceSchema = z.object({
  quotationTypeId: z.string().min(1),
  sectionLabel: z.string().min(1),
  sectionTitle: z.string().min(1, "請輸入大項標題"),
  period: z.string().optional(),
  quantity: z.string().optional(),
  subtotal: z.number().int().default(0),
  terms: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
  items: z.array(quotationItemSchema).default([]),
});

export const createQuotationSchema = z.object({
  projectName: z.string().min(1, "請輸入專案名稱"),
  companyName: z.string().min(1, "請輸入公司名稱"),
  contactAddress: z.string().optional(),
  primaryContact: z.string().min(1, "請輸入主要窗口"),
  projectPeriod: z.string().optional(),
  companyTaxId: z.string().optional(),
  companyPhone: z.string().optional(),
  contactPhone: z.string().optional(),
  generalTerms: z.array(z.string()).default([]),
  notes: z.string().optional(),
  services: z.array(quotationServiceSchema).min(1, "至少需要一個服務項目"),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type QuotationServiceInput = z.infer<typeof quotationServiceSchema>;
export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

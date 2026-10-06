export const CATEGORY_OPTIONS = [
  { code: "FOOD", label: "Comida" },
  { code: "SUPERMARKET", label: "Supermercado" },
  { code: "TRANSPORT", label: "Transporte" },
  { code: "FUEL", label: "Combustible" },
  { code: "OUTINGS", label: "Salidas" },
  { code: "EDUCATION", label: "Facultad / educación" },
  { code: "HEALTH", label: "Salud" },
  { code: "SERVICES", label: "Servicios" },
  { code: "OTHER", label: "Otros" },
  { code: "UNCATEGORIZED", label: "Sin categoría" },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { code: "CASH", label: "Efectivo" },
  { code: "MERCADO_PAGO", label: "Mercado Pago" },
  { code: "DEBIT", label: "Débito" },
  { code: "CREDIT", label: "Crédito" },
  { code: "TRANSFER", label: "Transferencia" },
  { code: "OTHER", label: "Otro" },
] as const;

export const CATEGORY_CODES = [
  "FOOD", "SUPERMARKET", "TRANSPORT", "FUEL", "OUTINGS",
  "EDUCATION", "HEALTH", "SERVICES", "OTHER", "UNCATEGORIZED",
] as const;

export const PAYMENT_METHOD_CODES = [
  "CASH", "MERCADO_PAGO", "DEBIT", "CREDIT", "TRANSFER", "OTHER",
] as const;

export type Category = (typeof CATEGORY_CODES)[number];
export type PaymentMethod = (typeof PAYMENT_METHOD_CODES)[number];

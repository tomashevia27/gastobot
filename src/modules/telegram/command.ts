import { todayInBuenosAires } from "@/modules/expenses/domain/dates";
import type { TelegramBotCommand } from "./client";

const payments = {
  efectivo: "CASH", mercado_pago: "MERCADO_PAGO", debito: "DEBIT", credito: "CREDIT",
  transferencia: "TRANSFER", otro: "OTHER",
} as const;

const categories = {
  comida: "FOOD", supermercado: "SUPERMARKET", transporte: "TRANSPORT", combustible: "FUEL",
  salidas: "OUTINGS", educacion: "EDUCATION", salud: "HEALTH", servicios: "SERVICES",
  otros: "OTHER", sin_categoria: "UNCATEGORIZED",
} as const;

const options = { "--categoria": "category", "--fecha": "occurredOn", "--titulo": "title", "--comercio": "merchant", "--descripcion": "description" } as const;

export const TELEGRAM_WELCOME = [
  "Hola, soy GastoBot y registro tus gastos personales en pesos argentinos.",
  "Tocá «Registrar gasto» para cargar uno paso a paso, o usá /gasto para el ingreso rápido.",
  "/ayuda muestra todos los comandos.",
].join("\n");

export const TELEGRAM_HELP = [
  "Registro guiado: /registrar_gasto (también acepto /registrar-gasto). Te pregunto un dato por vez, con botones, y muestro un resumen para confirmar, corregir o cancelar.",
  "Ingreso rápido: /gasto MONTO MEDIO [opciones]",
  "Ejemplo: /gasto 8.500,50 efectivo --categoria comida --fecha 2026-10-08 --titulo \"Almuerzo\" --comercio \"Kiosco Norte\"",
  "Medios: efectivo, mercado_pago, debito, credito, transferencia, otro.",
  "Categorías: comida, supermercado, transporte, combustible, salidas, educacion, salud, servicios, otros, sin_categoria.",
  "Opciones de /gasto: --categoria, --fecha, --titulo, --comercio, --descripcion. Son opcionales.",
  "Otros comandos: /cancelar descarta el registro en curso.",
].join("\n");

export const TELEGRAM_NO_FLOW_HINT = [
  "No hay un registro en curso. Enviá /registrar_gasto para empezar uno paso a paso o /ayuda para ver los comandos.",
].join("\n");

export const TELEGRAM_MENU: TelegramBotCommand[] = [
  { command: "registrar_gasto", description: "Registrar un gasto paso a paso" },
  { command: "gasto", description: "Registrar gasto con un comando rápido" },
  { command: "cancelar", description: "Cancelar el registro en curso" },
  { command: "ayuda", description: "Ver ayuda y ejemplos" },
];

type ExpenseCommand = {
  amount: string;
  occurredOn: string;
  category?: (typeof categories)[keyof typeof categories];
  paymentMethod: (typeof payments)[keyof typeof payments];
  title?: string;
  merchant?: string;
  description?: string;
};

export type ParsedCommand =
  | { kind: "welcome" }
  | { kind: "help" }
  | { kind: "cancel" }
  | { kind: "register" }
  | { kind: "error"; message: string }
  | { kind: "create"; input: ExpenseCommand };

export function commandWord(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return "";
  const word = trimmed.split(/\s/, 1)[0];
  const atIndex = word.indexOf("@");
  return atIndex === -1 ? word : word.slice(0, atIndex);
}

export function isQuickGastoCommand(text: string): boolean {
  return commandWord(text) === "/gasto";
}

function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let token = "";
  let quoted = false;
  let started = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted && char === "\\") {
      const next = input[++index];
      if (next !== '"' && next !== "\\") return null;
      token += next;
    } else if (char === '"') {
      quoted = !quoted;
      started = true;
    } else if (!quoted && /\s/.test(char)) {
      if (started) tokens.push(token);
      token = "";
      started = false;
    } else {
      token += char;
      started = true;
    }
  }
  if (quoted) return null;
  if (started) tokens.push(token);
  return tokens;
}

export function parseTelegramCommand(text: string, sentAt: Date): ParsedCommand {
  if (text.length > 2048) return { kind: "error", message: "El comando es demasiado largo." };
  const tokens = tokenize(text.trim());
  if (!tokens) return { kind: "error", message: "Revisá las comillas del comando. Usá /ayuda para ver un ejemplo." };

  const word = commandWord(text);
  if (word === "/start") return { kind: "welcome" };
  if (word === "/ayuda" || word === "/help") return { kind: "help" };
  if (word === "/cancelar") return { kind: "cancel" };
  if (word === "/registrar_gasto" || word === "/registrar-gasto") return { kind: "register" };
  if (word !== "/gasto") {
    return { kind: "error", message: word ? "Comando desconocido. Usá /ayuda." : TELEGRAM_NO_FLOW_HINT };
  }
  if (tokens.length < 3) return { kind: "error", message: "Faltan monto o medio de pago. Usá /ayuda." };

  tokens[0] = "/gasto";
  const paymentMethod = payments[tokens[2] as keyof typeof payments];
  if (!paymentMethod) return { kind: "error", message: "Medio de pago desconocido. Usá /ayuda para ver los valores válidos." };

  const input: ExpenseCommand = { amount: tokens[1], paymentMethod, occurredOn: todayInBuenosAires(sentAt) };
  const seen = new Set<string>();
  for (let index = 3; index < tokens.length; index += 2) {
    const option = tokens[index];
    const key = options[option as keyof typeof options];
    if (!key) return { kind: "error", message: `Opción desconocida: ${option}. Usá /ayuda.` };
    if (seen.has(option)) return { kind: "error", message: `La opción ${option} está repetida.` };
    const value = tokens[index + 1];
    if (!value || value.startsWith("--")) return { kind: "error", message: `Falta el valor de ${option}.` };
    seen.add(option);
    if (key === "category") {
      const category = categories[value as keyof typeof categories];
      if (!category) return { kind: "error", message: "Categoría desconocida. Usá /ayuda para ver los valores válidos." };
      input.category = category;
    } else if (key === "occurredOn") input.occurredOn = value;
    else input[key] = value;
  }
  return { kind: "create", input };
}

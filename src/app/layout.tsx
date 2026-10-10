import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GastoBot",
  description: "Tu cuaderno de gastos. Anotá y explorá tus gastos en pesos, sin vueltas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}

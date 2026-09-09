// lib/printer.ts
import { ThermalPrinter, PrinterTypes, CharacterSet } from "node-thermal-printer";
import { logger } from "./logger";

let printerInstance: ThermalPrinter | null = null;
let configuredInterface: string | null = null;

// File d'attente simple : garantit qu'une seule impression écrit dans le buffer à la fois.
let printQueue: Promise<void> = Promise.resolve();

function enqueuePrintJob<T>(job: () => Promise<T>): Promise<T> {
  const result = printQueue.then(job, job);
  // On avale l'erreur ici pour ne pas bloquer les impressions suivantes,
  // mais on la laisse remonter au caller via `result`.
  printQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function configurePrinter(interfaceName?: string) {
  const targetInterface = interfaceName && interfaceName.trim() !== "" ? interfaceName : "usb";
  if (printerInstance && configuredInterface === targetInterface) return;

  printerInstance = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: targetInterface,
    // Pas de contenu arabe sur les tickets : charset latin standard,
    // pris en charge nativement par la quasi-totalité des imprimantes ESC/POS.
    characterSet: CharacterSet.PC850_MULTILINGUAL,
  });
  configuredInterface = targetInterface;
}

export function getPrinter(): ThermalPrinter {
  if (!printerInstance) configurePrinter();
  return printerInstance!;
}

export interface TicketData {
  saleNumber: string;
  cashierName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
}

// Formatage monétaire cohérent (évite les artefacts de virgule flottante type 59.699999999999996).
function money(n: number): string {
  return n.toFixed(2);
}

// Découpe un nom de produit trop long pour éviter un rendu cassé sur les imprimantes
// à largeur réduite (souvent 32 ou 42 caractères).
function wrapText(text: string, maxWidth = 32): string[] {
  if (text.length <= maxWidth) return [text];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > maxWidth) {
    lines.push(remaining.slice(0, maxWidth));
    remaining = remaining.slice(maxWidth);
  }
  if (remaining.length > 0) lines.push(remaining);
  return lines;
}

async function ensureConnected(printer: ThermalPrinter): Promise<void> {
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error("Imprimante non connectée.");
  }
}

export async function printSaleTicket(data: TicketData): Promise<void> {
  return enqueuePrintJob(async () => {
    const printer = getPrinter();
    try {
      await ensureConnected(printer);

      printer.alignCenter();
      printer.println("YasCode Store");
      printer.drawLine();
      printer.alignLeft();
      printer.println(`Facture N: ${data.saleNumber}`);
      printer.println(`Caissier: ${data.cashierName}`);
      printer.println(`Date: ${data.createdAt}`);
      printer.drawLine();

      for (const item of data.items) {
        for (const line of wrapText(item.name)) {
          printer.println(line);
        }
        printer.println(`  ${item.quantity} x ${money(item.unitPrice)} = ${money(item.lineTotal)}`);
      }

      printer.drawLine();
      printer.println(`Sous-total: ${money(data.subtotal)}`);
      if (data.discount > 0) printer.println(`Remise: ${money(data.discount)}`);
      printer.bold(true);
      printer.println(`Total: ${money(data.total)}`);
      printer.bold(false);
      printer.cut();

      await printer.execute();
    } catch (err) {
      logger.error("Échec de l'impression du ticket", err);
      // Empêche le contenu partiel de "coller" à la prochaine impression.
      printer.clear();
      throw err;
    }
  });
}

export async function printBarcodeLabel(barcodeImageBuffer: Buffer, productName: string): Promise<void> {
  return enqueuePrintJob(async () => {
    const printer = getPrinter();
    try {
      await ensureConnected(printer);

      printer.alignCenter();
      for (const line of wrapText(productName)) {
        printer.println(line);
      }
      printer.printImageBuffer(barcodeImageBuffer);
      printer.cut();

      await printer.execute();
    } catch (err) {
      logger.error("Échec de l'impression de l'étiquette", err);
      printer.clear();
      throw err;
    }
  });
}
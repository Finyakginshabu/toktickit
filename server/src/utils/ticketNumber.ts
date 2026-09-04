import { Prisma } from "@prisma/client";

/**
 * Generates a unique sequential ticket number in the format TKT-YYYY-XXXXXX.
 * (e.g. TKT-2026-000001)
 */
export async function generateTicketNumber(
  tx: Prisma.TransactionClient,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `TKT-${year}-`;
  
  // Count existing tickets for the current year
  const count = await tx.ticket.count({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
  });

  const nextSeq = count + 1;
  const seqPadded = String(nextSeq).padStart(6, "0");
  return `${prefix}${seqPadded}`;
}

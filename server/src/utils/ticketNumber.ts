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
  
  const lastTicket = await tx.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSeq = 1;
  if (lastTicket && lastTicket.ticketNumber) {
    const parts = lastTicket.ticketNumber.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  // Verify candidate uniqueness before returning
  while (true) {
    const seqPadded = String(nextSeq).padStart(6, "0");
    const candidate = `${prefix}${seqPadded}`;
    const exists = await tx.ticket.findUnique({
      where: { ticketNumber: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextSeq++;
  }
}

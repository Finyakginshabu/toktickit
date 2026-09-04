import { getPrisma } from "../src/prisma.js";

// Lab 2 Seed Data: Categories, Related Systems, and Development Requesters
// Requirement: running the seed twice must NOT create duplicates (idempotent via upsert).
async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories (4)
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✓ Seeded ${categories.length} request categories successfully.`);

  // 2. Seed Related Systems (7)
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`✓ Seeded ${relatedSystems.length} related systems successfully.`);

  // 3. Seed Development Requesters (4 active, 1 inactive)
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      department: "Computer Engineering",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@kmutt.ac.th",
      department: "Information Technology",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@kmutt.ac.th",
      department: "Digital Media",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@kmutt.ac.th",
      department: "Electrical Engineering",
      isActive: true,
    },
    {
      name: "Alex Inactive",
      email: "alex.inactive@kmutt.ac.th",
      department: "General Studies",
      isActive: false,
    },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: {
        name: req.name,
        email: req.email,
        department: req.department,
        isActive: req.isActive,
      },
    });
  }
  console.log(`✓ Seeded ${requesters.length} development requesters (4 active, 1 inactive) successfully.`);

  // 4. Seed Demo Tickets for Requester Context Verification
  const jennifer = await prisma.requesterUser.findUnique({ where: { email: "jennifer.anderson@kmutt.ac.th" } });
  const david = await prisma.requesterUser.findUnique({ where: { email: "david.lee@kmutt.ac.th" } });

  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catAccount = await prisma.category.findUnique({ where: { name: "Account and Access" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });

  const sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const sysWifi = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
  const sysLeb2 = await prisma.relatedSystem.findUnique({ where: { name: "LEB2 App" } });
  const sysVpn = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });
  const sysPrinter = await prisma.relatedSystem.findUnique({ where: { name: "Printer" } });
  const sysEmail = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });
  const sysGrade = await prisma.relatedSystem.findUnique({ where: { name: "Grade Submission App" } });

  if (jennifer && catHardware && catNetwork && catAccount && sysLaptop && sysWifi && sysLeb2 && sysVpn && sysPrinter) {
    const demoTicketsJennifer = [
      {
        ticketNumber: "TKT-2026-000001",
        requesterId: jennifer.id,
        categoryId: catHardware.id,
        relatedSystemId: sysLaptop.id,
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        summary: "Laptop battery drains quickly during video calls",
        description: "The laptop battery drops from 100% to under 20% in less than 45 minutes when attending Microsoft Teams or Zoom meetings.",
      },
      {
        ticketNumber: "TKT-2026-000002",
        requesterId: jennifer.id,
        categoryId: catNetwork.id,
        relatedSystemId: sysWifi.id,
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        summary: "Cannot connect to Campus Wi-Fi in building 3",
        description: "Experiencing continuous authentication loop when attempting to log into KMUTT-Secure Wi-Fi on the 4th floor.",
      },
      {
        ticketNumber: "TKT-2026-000003",
        requesterId: jennifer.id,
        categoryId: catAccount.id,
        relatedSystemId: sysLeb2.id,
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        summary: "Need access to LEB2 course engineering portal",
        description: "Requesting teacher assistant enrollment permissions for CPE334 semester 1 section.",
      },
      {
        ticketNumber: "TKT-2026-000004",
        requesterId: jennifer.id,
        categoryId: catNetwork.id,
        relatedSystemId: sysVpn.id,
        requestedPriority: "URGENT" as const,
        itPriority: "URGENT" as const,
        currentStatus: "IN_PROGRESS" as const,
        summary: "VPN client disconnects every 10 minutes",
        description: "The corporate VPN drops connection every 10 minutes, disrupting remote laboratory work.",
      },
      {
        ticketNumber: "TKT-2026-000005",
        requesterId: jennifer.id,
        categoryId: catHardware.id,
        relatedSystemId: sysPrinter.id,
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "RESOLVED" as const,
        summary: "Office printer paper jam in floor 4 lab",
        description: "Printer tray 2 indicates paper jam error even after clearing all visible sheets.",
      },
    ];

    for (const dt of demoTicketsJennifer) {
      await prisma.ticket.upsert({
        where: { ticketNumber: dt.ticketNumber },
        update: {
          summary: dt.summary,
          description: dt.description,
          requestedPriority: dt.requestedPriority,
          itPriority: dt.itPriority,
          currentStatus: dt.currentStatus,
        },
        create: dt,
      });
    }
  }

  if (david && catAccount && catSoftware && sysEmail && sysGrade) {
    const demoTicketsDavid = [
      {
        ticketNumber: "TKT-2026-000006",
        requesterId: david.id,
        categoryId: catAccount.id,
        relatedSystemId: sysEmail.id,
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "NEW" as const,
        summary: "David's Email sync error on mobile Outlook",
        description: "Office 365 Outlook on iOS fails with exchange sync error 80090308.",
      },
      {
        ticketNumber: "TKT-2026-000007",
        requesterId: david.id,
        categoryId: catSoftware.id,
        relatedSystemId: sysGrade.id,
        requestedPriority: "URGENT" as const,
        itPriority: "URGENT" as const,
        currentStatus: "NEW" as const,
        summary: "Grade Submission portal timeout during batch upload",
        description: "Submitting mid-term score CSV triggers 504 Gateway Timeout error for large courses.",
      },
    ];

    for (const dt of demoTicketsDavid) {
      await prisma.ticket.upsert({
        where: { ticketNumber: dt.ticketNumber },
        update: {
          summary: dt.summary,
          description: dt.description,
          requestedPriority: dt.requestedPriority,
          itPriority: dt.itPriority,
          currentStatus: dt.currentStatus,
        },
        create: dt,
      });
    }
  }
  console.log(`✓ Seeded demo tickets for Jennifer Anderson and David Lee successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

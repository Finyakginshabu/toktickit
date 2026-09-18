import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Priority, Role, TicketStatus } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";

// Lab 3 Seed Data: Categories, Related Systems, Multi-Role Users, Tickets, and Attachments
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

  // 3. Seed Users across 3 Roles with Hashed Passwords
  const salt = await bcrypt.genSalt(10);
  const defaultUserHash = await bcrypt.hash("Password123!", salt);
  const adminHash = await bcrypt.hash("AdminPass123!", salt);
  const initialHash = await bcrypt.hash("InitialPassword123!", salt);

  const users = [
    // 4 Active Requesters
    {
      email: "jennifer.anderson@kmutt.ac.th",
      name: "Jennifer Anderson",
      role: "REQUESTER" as const,
      passwordHash: defaultUserHash,
      department: "Computer Engineering",
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "david.lee@kmutt.ac.th",
      name: "David Lee",
      role: "REQUESTER" as const,
      passwordHash: defaultUserHash,
      department: "Information Technology",
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "sarah.johnson@kmutt.ac.th",
      name: "Sarah Johnson",
      role: "REQUESTER" as const,
      passwordHash: defaultUserHash,
      department: "Digital Media",
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "michael.brown@kmutt.ac.th",
      name: "Michael Brown",
      role: "REQUESTER" as const,
      passwordHash: defaultUserHash,
      department: "Electrical Engineering",
      isActive: true,
      mustChangePassword: false,
    },
    // 1 Inactive Requester
    {
      email: "alex.inactive@kmutt.ac.th",
      name: "Alex Inactive",
      role: "REQUESTER" as const,
      passwordHash: defaultUserHash,
      department: "General Studies",
      isActive: false,
      mustChangePassword: false,
    },
    // 3 Active IT Staff
    {
      email: "staff.alice@toktickit.local",
      name: "Alice Support",
      role: "IT_STAFF" as const,
      passwordHash: defaultUserHash,
      department: "IT Operations",
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "staff.bob@toktickit.local",
      name: "Bob Technician",
      role: "IT_STAFF" as const,
      passwordHash: defaultUserHash,
      department: "Network Infrastructure",
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "staff.charlie@toktickit.local",
      name: "Charlie Engineer",
      role: "IT_STAFF" as const,
      passwordHash: defaultUserHash,
      department: "Desktop Support",
      isActive: true,
      mustChangePassword: false,
    },
    // 1 Inactive IT Staff
    {
      email: "staff.inactive@toktickit.local",
      name: "Inactive Staff",
      role: "IT_STAFF" as const,
      passwordHash: defaultUserHash,
      department: "IT Operations",
      isActive: false,
      mustChangePassword: false,
    },
    // 1 Active Administrator
    {
      email: "admin@toktickit.local",
      name: "System Administrator",
      role: "ADMINISTRATOR" as const,
      passwordHash: adminHash,
      department: "IT Administration",
      isActive: true,
      mustChangePassword: false,
    },
    // 1 First-Login Test User (mustChangePassword = true)
    {
      email: "firstlogin@toktickit.local",
      name: "New Employee",
      role: "REQUESTER" as const,
      passwordHash: initialHash,
      department: "Computer Engineering",
      isActive: true,
      mustChangePassword: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role as Role,
        passwordHash: u.passwordHash,
        department: u.department,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
      create: { ...u, role: u.role as Role },
    });
  }
  console.log(`✓ Seeded ${users.length} users across Requester, IT Staff, and Administrator roles successfully.`);

  // 4. Seed Demo Tickets
  const jennifer = await prisma.user.findUnique({ where: { email: "jennifer.anderson@kmutt.ac.th" } });
  const david = await prisma.user.findUnique({ where: { email: "david.lee@kmutt.ac.th" } });
  const sarah = await prisma.user.findUnique({ where: { email: "sarah.johnson@kmutt.ac.th" } });
  const michael = await prisma.user.findUnique({ where: { email: "michael.brown@kmutt.ac.th" } });
  const aliceStaff = await prisma.user.findUnique({ where: { email: "staff.alice@toktickit.local" } });
  const bobStaff = await prisma.user.findUnique({ where: { email: "staff.bob@toktickit.local" } });
  const charlieStaff = await prisma.user.findUnique({ where: { email: "staff.charlie@toktickit.local" } });

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
        ticketOwnerId: null,
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
        currentStatus: "OPEN" as const,
        ticketOwnerId: aliceStaff ? aliceStaff.id : null,
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
        ticketOwnerId: null,
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
        ticketOwnerId: aliceStaff ? aliceStaff.id : null,
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
        ticketOwnerId: aliceStaff ? aliceStaff.id : null,
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
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
          ticketOwnerId: dt.ticketOwnerId,
        },
        create: {
          ...dt,
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
        },
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
        ticketOwnerId: null,
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
        ticketOwnerId: null,
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
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
          ticketOwnerId: dt.ticketOwnerId,
        },
        create: {
          ...dt,
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
        },
      });
    }
  }

  if (sarah && catSoftware && catHardware && sysLeb2 && sysLaptop) {
    const demoTicketsSarah = [
      {
        ticketNumber: "TKT-2026-000008",
        requesterId: sarah.id,
        categoryId: catSoftware.id,
        relatedSystemId: sysLeb2.id,
        requestedPriority: "MEDIUM" as const,
        itPriority: "HIGH" as const,
        currentStatus: "WAITING_FOR_REQUESTER" as const,
        ticketOwnerId: bobStaff ? bobStaff.id : null,
        summary: "Quiz upload failed with format error",
        description: "LEB2 midterm quiz question bank CSV fails to parse with line ending mismatch error.",
      },
      {
        ticketNumber: "TKT-2026-000009",
        requesterId: sarah.id,
        categoryId: catHardware.id,
        relatedSystemId: sysLaptop.id,
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "CLOSED" as const,
        ticketOwnerId: charlieStaff ? charlieStaff.id : null,
        summary: "External monitor HDMI adapter replacement",
        description: "USB-C to HDMI adapter in lab room 302 stopped displaying external video output.",
      },
    ];

    for (const dt of demoTicketsSarah) {
      await prisma.ticket.upsert({
        where: { ticketNumber: dt.ticketNumber },
        update: {
          summary: dt.summary,
          description: dt.description,
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
          ticketOwnerId: dt.ticketOwnerId,
        },
        create: {
          ...dt,
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
        },
      });
    }
  }

  if (michael && catNetwork && catAccount && sysWifi && sysEmail) {
    const demoTicketsMichael = [
      {
        ticketNumber: "TKT-2026-000010",
        requesterId: michael.id,
        categoryId: catNetwork.id,
        relatedSystemId: sysWifi.id,
        requestedPriority: "HIGH" as const,
        itPriority: "URGENT" as const,
        currentStatus: "REOPENED" as const,
        ticketOwnerId: aliceStaff ? aliceStaff.id : null,
        summary: "Wi-Fi keeps dropping in library second floor",
        description: "The KMUTT-Secure access point in zone B drops association every 5 minutes.",
      },
      {
        ticketNumber: "TKT-2026-000011",
        requesterId: michael.id,
        categoryId: catAccount.id,
        relatedSystemId: sysEmail.id,
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "CANCELLED" as const,
        ticketOwnerId: null,
        summary: "Duplicate account request for lab assistant",
        description: "Requested secondary email alias which is no longer needed after roster review.",
      },
    ];

    for (const dt of demoTicketsMichael) {
      await prisma.ticket.upsert({
        where: { ticketNumber: dt.ticketNumber },
        update: {
          summary: dt.summary,
          description: dt.description,
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
          ticketOwnerId: dt.ticketOwnerId,
        },
        create: {
          ...dt,
          requestedPriority: dt.requestedPriority as Priority,
          itPriority: dt.itPriority as Priority,
          currentStatus: dt.currentStatus as TicketStatus,
        },
      });
    }
  }

  // 5. Seed Demo Attachments
  const tkt1 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000001" } });
  if (tkt1) {
    const uploadDir = path.join(process.cwd(), "uploads", "attachments");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const samplePdfPath = path.join(uploadDir, "sample_battery_report.pdf");
    if (!fs.existsSync(samplePdfPath)) {
      fs.writeFileSync(samplePdfPath, "%PDF-1.4 sample pdf file for ticket testing");
    }

    const samplePngPath = path.join(uploadDir, "sample_old_diagnostic.png");
    if (!fs.existsSync(samplePngPath)) {
      fs.writeFileSync(samplePngPath, "dummy png content");
    }

    const existingActive = await prisma.attachment.findFirst({
      where: { ticketId: tkt1.id, originalName: "battery_report.pdf" },
    });
    if (!existingActive) {
      await prisma.attachment.create({
        data: {
          ticketId: tkt1.id,
          fileName: "sample_battery_report.pdf",
          originalName: "battery_report.pdf",
          fileSize: 42,
          mimeType: "application/pdf",
          storagePath: "uploads/attachments/sample_battery_report.pdf",
          isRemoved: false,
        },
      });
    }

    const existingRemoved = await prisma.attachment.findFirst({
      where: { ticketId: tkt1.id, originalName: "old_diagnostic.png" },
    });
    if (!existingRemoved) {
      await prisma.attachment.create({
        data: {
          ticketId: tkt1.id,
          fileName: "sample_old_diagnostic.png",
          originalName: "old_diagnostic.png",
          fileSize: 1024,
          mimeType: "image/png",
          storagePath: "uploads/attachments/sample_old_diagnostic.png",
          isRemoved: true,
          removedReason: "Uploaded incorrect diagnostic report",
          removedAt: new Date(),
        },
      });
    }
  }

  console.log(`✓ Seeded demo tickets and attachments successfully.`);

  // 6. Seed Demo Public Comments & Internal Notes
  const tkt4 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000004" } });
  const tkt2 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000002" } });

  if (tkt4 && aliceStaff && jennifer && bobStaff) {
    const existingComments = await prisma.publicComment.count({ where: { ticketId: tkt4.id } });
    if (existingComments === 0) {
      await prisma.publicComment.createMany({
        data: [
          {
            ticketId: tkt4.id,
            authorId: aliceStaff.id,
            content: "We have checked the VPN gateway and need more log info.",
            createdAt: new Date("2026-09-17T10:15:00.000Z"),
          },
          {
            ticketId: tkt4.id,
            authorId: jennifer.id,
            content: "Uploaded the requested network diagnostic log.",
            createdAt: new Date("2026-09-17T10:20:00.000Z"),
          },
        ],
      });
    }

    const existingNotes = await prisma.internalNote.count({ where: { ticketId: tkt4.id } });
    if (existingNotes === 0) {
      await prisma.internalNote.createMany({
        data: [
          {
            ticketId: tkt4.id,
            authorId: aliceStaff.id,
            content: "Known issue on Gateway cluster 3 after firmware update.",
            createdAt: new Date("2026-09-17T10:12:00.000Z"),
          },
          {
            ticketId: tkt4.id,
            authorId: bobStaff.id,
            content: "Investigating firewall rule changes made yesterday.",
            createdAt: new Date("2026-09-17T10:25:00.000Z"),
          },
        ],
      });
    }
  }

  // Set problemAppearsResolved demonstration on TKT-2026-000002
  if (tkt2 && jennifer) {
    await prisma.ticket.update({
      where: { id: tkt2.id },
      data: {
        problemAppearsResolved: true,
        problemAppearsResolvedAt: new Date("2026-09-17T11:00:00.000Z"),
      },
    });

    const existingAudit = await prisma.publicComment.findFirst({
      where: {
        ticketId: tkt2.id,
        content: "Requester indicated that the problem appears resolved.",
      },
    });
    if (!existingAudit) {
      await prisma.publicComment.create({
        data: {
          ticketId: tkt2.id,
          authorId: jennifer.id,
          content: "Requester indicated that the problem appears resolved.",
          createdAt: new Date("2026-09-17T11:00:00.000Z"),
        },
      });
    }
  }

  console.log(`✓ Seeded demo discussions and requester resolution successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

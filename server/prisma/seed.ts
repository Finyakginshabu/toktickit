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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

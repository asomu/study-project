import { loadLocalEnv } from "./load-local-env";

async function main() {
  loadLocalEnv();
  const { seedDemoData } = await import("../src/modules/demo/demo-data");

  const result = await seedDemoData();

  console.log(
    [
      "Demo seed completed.",
      `studentId=${result.studentId}`,
      `referenceDate=${result.referenceDate}`,
      `studentWorkbookId=${result.studentWorkbookId}`,
      `wrongNotes=${result.wrongNoteCount}`,
      `progressRows=${result.progressRowCount}`,
    ].join(" "),
  );
}

main()
  .catch(async (error) => {
    console.error("Demo seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (await import("../src/lib/prisma")).prisma.$disconnect();
  });

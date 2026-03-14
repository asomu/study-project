import { loadLocalEnv } from "./load-local-env";

async function main() {
  loadLocalEnv();
  const { clearDemoData } = await import("../src/modules/demo/demo-data");

  await clearDemoData();
  console.log("Demo data cleared.");
}

main()
  .catch(async (error) => {
    console.error("Demo clear failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (await import("../src/lib/prisma")).prisma.$disconnect();
  });

import { loadLocalEnv } from "./load-local-env";

async function main() {
  loadLocalEnv();
  const { ensureDemoStudentLogin } = await import("../src/modules/demo/demo-data");

  const result = await ensureDemoStudentLogin({
    loginId: process.env.DEMO_STUDENT_LOGIN_ID,
    password: process.env.DEMO_STUDENT_PASSWORD,
    displayName: process.env.DEMO_STUDENT_DISPLAY_NAME,
  });

  console.log(
    [
      result.alreadyActive ? "Demo student login refreshed." : "Demo student login activated.",
      `studentId=${result.studentId}`,
      `loginId=${result.loginId}`,
      `displayName=${result.displayName}`,
    ].join(" "),
  );
}

main()
  .catch(async (error) => {
    console.error("Demo student activation failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (await import("../src/lib/prisma")).prisma.$disconnect();
  });

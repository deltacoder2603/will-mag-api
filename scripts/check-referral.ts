import { db } from "../src/db";

async function main() {
  const targetEmail = "crew6437@gmail.com";

  const user = await db.user.findUnique({
    where: { email: targetEmail },
    include: {
      profile: true,
      referrals: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`No user found with email ${targetEmail}`);
    return;
  }

  console.log(`User: ${user.name} (${user.id})`);
  console.log(`Referral code: ${user.referralCode ?? "none"}`);
  console.log(`Referral count column: ${user.referralCount}`);
  console.log(`Total linked referrals: ${user.referrals.length}`);
  console.log("Referral details:");
  user.referrals.forEach((referral, index) => {
    console.log(
      `  ${index + 1}. ${referral.name ?? "(no name)"} | ${referral.email ?? "(no email)"} | joined ${referral.createdAt.toISOString()}`,
    );
  });
}

main()
  .catch((error) => {
    console.error("Error checking referral data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });



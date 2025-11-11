import app from "../src/app";
import { db } from "../src/db";

const targetEmail = "crew6437@gmail.com";

async function main() {
  const user = await db.user.findUnique({
    where: { email: targetEmail },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`User with email ${targetEmail} not found`);
  }

  const response = await app.request(`/api/v1/referrals/${user.id}/stats`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to fetch referral stats via API:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });



import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

export async function createUserFromClerkData(data: {
  id: string;
  first_name: string;
  last_name: string;
  email_addresses: { id: string; email_address: string }[];
  primary_email_address_id: string;
}) {
  const primaryEmail = data.email_addresses?.find(
    (email) => email.id === data.primary_email_address_id
  )?.email_address;

  return prisma.user.create({
    data: {
      id: data.id,
      clerkId: data.id,
      email: primaryEmail || "",
      name: `${data.first_name} ${data.last_name}`,
    },
  });
}

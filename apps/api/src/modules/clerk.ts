import { createClerkClient } from "@clerk/backend";

/** Small wrapper so the rest of the app doesn't depend on Clerk's SDK shape. */
export const clerkClient = {
  async isEmailVerified(clerkId: string, email: string) {
    if (process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production") return true;
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(clerkId);
    return user.emailAddresses.some((e) => e.emailAddress.toLowerCase() === email.toLowerCase() && e.verification?.status === "verified");
  },
};

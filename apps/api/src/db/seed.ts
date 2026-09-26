/**
 * Local development seed: one admin, five approved teachers (same sample data as the web mock),
 * one student. Clerk ids are fake — use them with DEV_AUTH=1 and the `x-dev-user` header.
 */
import "dotenv/config";
import { createDb } from "./db";
import * as s from "./schema";

const teachers = [
  { first: "Sarah", last: "Mitchell", slug: "sarah-mitchell", tz: "America/Chicago", city: "Austin, TX", price: 3500, years: 8, specialties: ["Business English", "Interview Prep", "Conversation"], teaches: ["adults", "teens"], gender: "female" as const, p5: true, p10: true },
  { first: "Amanda", last: "Lee", slug: "amanda-lee", tz: "America/New_York", city: "Boston, MA", price: 4500, years: 12, specialties: ["IELTS Prep", "TOEFL Prep", "Business English"], teaches: ["adults"], gender: "female" as const, p5: true, p10: true },
  { first: "James", last: "Robinson", slug: "james-robinson", tz: "America/Chicago", city: "Chicago, IL", price: 2800, years: 5, specialties: ["Conversation", "Business English", "Travel"], teaches: ["adults", "teens"], gender: "male" as const, p5: true, p10: false },
  { first: "Michael", last: "Brooks", slug: "michael-brooks", tz: "America/Los_Angeles", city: "Seattle, WA", price: 5000, years: 10, specialties: ["Business English", "Corporate"], teaches: ["adults"], gender: "male" as const, p5: false, p10: true },
  { first: "David", last: "King", slug: "david-king", tz: "America/Denver", city: "Denver, CO", price: 2200, years: 3, specialties: ["Teens", "General English"], teaches: ["teens"], gender: "male" as const, p5: true, p10: true },
];

async function main() {
  const { db, close } = createDb(process.env.DATABASE_URL!);
  await db.insert(s.users).values({ clerkId: "dev_admin", role: "admin", status: "active", email: "admin@amerivo.dev", firstName: "Ada", lastName: "Admin" }).onConflictDoNothing();
  await db.insert(s.users).values({ clerkId: "dev_maria", role: "student", status: "active", email: "maria@amerivo.dev", firstName: "Maria", lastName: "Silva", country: "Brazil", timezone: "Europe/Zurich" }).onConflictDoNothing();
  for (const t of teachers) {
    const [u] = await db
      .insert(s.users)
      .values({ clerkId: `dev_${t.slug}`, role: "teacher", status: "active", email: `${t.slug}@amerivo.dev`, firstName: t.first, lastName: t.last, timezone: t.tz })
      .onConflictDoNothing()
      .returning();
    if (!u) continue;
    await db.insert(s.teacherProfiles).values({
      userId: u.id, slug: t.slug, status: "approved", timezone: t.tz, city: t.city, priceCents: t.price, yearsExperience: t.years, specialties: t.specialties, teaches: t.teaches,
      gender: t.gender, offersTrial: t.slug !== "michael-brooks", offersPack5: t.p5, offersPack10: t.p10, identityStatus: "verified", headline: t.specialties[0], bio: `${t.first} teaches ${t.specialties.join(", ")}.`, approvedAt: new Date(),
    });
    // Weekdays 9:00–13:00 and 16:00–19:00, teacher time.
    const rules = [1, 2, 3, 4, 5].flatMap((weekday) => [{ teacherId: u.id, weekday, startMinute: 540, endMinute: 780 }, { teacherId: u.id, weekday, startMinute: 960, endMinute: 1140 }]);
    await db.insert(s.availabilityRules).values(rules);
  }
  await close();
  console.log("Seeded: 1 admin (dev_admin), 1 student (dev_maria), 5 teachers (dev_<slug>)");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

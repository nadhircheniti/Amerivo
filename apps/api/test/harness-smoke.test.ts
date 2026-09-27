import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createTestApp } from "./harness";

describe("test harness", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  before(async () => {
    h = await createTestApp();
  });
  after(() => h.close());

  it("seeds users and a confirmed booking", async () => {
    const t = await h.seedTeacher("clerk_ht", { firstName: "Hana" });
    const s = await h.seedStudent("clerk_hs");
    const b = await h.seedBooking(s.id, t.id);
    const list = await h.http().get("/api/bookings").set(h.as("clerk_hs")).expect(200);
    assert.equal(list.body[0].id, b.id);
    assert.equal(list.body[0].withFirstName, "Hana");
  });
});

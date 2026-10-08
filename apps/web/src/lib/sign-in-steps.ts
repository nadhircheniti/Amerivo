/**
 * Password sign-in steps with Clerk (pure logic, unit-tested in test/helpers.test.ts).
 * From a new device or browser Clerk may answer "needs_client_trust" (or "needs_second_factor"
 * with two-step verification on): a code must then be sent and typed before the session exists.
 */
export type CodeStrategy = "email_code" | "phone_code" | "totp";
export type SignInCodeStep = { strategy: CodeStrategy; destination: string | null };
export type SecondFactor = { strategy: string; emailAddressId?: string; phoneNumberId?: string; safeIdentifier?: string };

/** The parts of Clerk's SignIn resource used here. */
export type SignInLike = {
  status: string | null;
  createdSessionId: string | null;
  supportedSecondFactors: SecondFactor[] | null;
  create(p: { identifier: string; password: string }): Promise<SignInLike>;
  prepareSecondFactor(p: { strategy: "email_code"; emailAddressId?: string } | { strategy: "phone_code"; phoneNumberId?: string }): Promise<unknown>;
  attemptSecondFactor(p: { strategy: CodeStrategy; code: string }): Promise<SignInLike>;
};

export type SignInOutcome = { sessionId: string } | { step: SignInCodeStep };

export class SignInIncompleteError extends Error {}

/** E-mail first (every account has one), then SMS, then an authenticator app. */
export function pickSecondFactor(factors: SecondFactor[] | null | undefined): SecondFactor | null {
  for (const s of ["email_code", "phone_code", "totp"]) {
    const f = factors?.find((x) => x.strategy === s);
    if (f) return f;
  }
  return null;
}

/** Sends the code for that factor (an authenticator app needs nothing sent). */
export async function sendSecondFactorCode(signIn: Pick<SignInLike, "prepareSecondFactor">, f: SecondFactor) {
  if (f.strategy === "email_code") await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId: f.emailAddressId });
  else if (f.strategy === "phone_code") await signIn.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: f.phoneNumberId });
}

export async function passwordSignIn(signIn: SignInLike, identifier: string, password: string): Promise<SignInOutcome> {
  const res = await signIn.create({ identifier, password });
  if (res.status === "complete" && res.createdSessionId) return { sessionId: res.createdSessionId };
  if (res.status === "needs_client_trust" || res.status === "needs_second_factor") {
    const f = pickSecondFactor(res.supportedSecondFactors);
    if (f) {
      await sendSecondFactorCode(signIn, f);
      return { step: { strategy: f.strategy as CodeStrategy, destination: f.safeIdentifier ?? null } };
    }
  }
  throw new SignInIncompleteError(res.status ?? "unknown");
}

export async function verifySecondFactor(signIn: SignInLike, step: SignInCodeStep, code: string): Promise<string> {
  const res = await signIn.attemptSecondFactor({ strategy: step.strategy, code });
  if (res.status === "complete" && res.createdSessionId) return res.createdSessionId;
  throw new SignInIncompleteError(res.status ?? "unknown");
}

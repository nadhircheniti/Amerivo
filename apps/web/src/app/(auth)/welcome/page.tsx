import type { Metadata } from "next";
import { AuthMain } from "../_components/auth-ui";
import { WelcomeFlow } from "./welcome-flow";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <AuthMain>
      <WelcomeFlow />
    </AuthMain>
  );
}

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Public self-signup is disabled for this deployment (CAP_ALLOWED_SIGNUP_DOMAINS
// blocks new accounts at the auth layer). Send everyone through /login instead.
export default function SignupPage() {
	redirect("/login");
}

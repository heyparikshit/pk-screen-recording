import "server-only";

import { db } from "@cap/database";
import { nanoId } from "@cap/database/helpers";
import { users } from "@cap/database/schema";
import type { User } from "@cap/web-domain";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const GUEST_COOKIE_NAME = "cap_guest_id";
const GUEST_EMAIL_DOMAIN = "guest.invalid";
const MAX_GUEST_NAME_LENGTH = 100;

export function isGuestEmail(email: string | null | undefined): boolean {
	return !!email && email.endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

/**
 * Resolves the anonymous commenter behind this browser into a real `users`
 * row, so every downstream query that joins comments to users (author name,
 * avatar, notifications) keeps working unchanged — no schema migration.
 *
 * The row has no password and no verified email, so it can never sign in;
 * `email` is a synthetic, unique placeholder only to satisfy the column's
 * NOT NULL + unique constraints. Reuses the same guest row across repeat
 * comments from this browser (via an httpOnly cookie) so a viewer's name
 * stays stable instead of forking a new identity per comment.
 */
export async function resolveGuestCommenter(
	name: string,
): Promise<User.UserId> {
	const trimmedName = name.trim().slice(0, MAX_GUEST_NAME_LENGTH);
	if (!trimmedName) throw new Error("Name is required");

	const cookieStore = await cookies();
	const existingId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

	if (existingId) {
		const [existing] = await db()
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, existingId))
			.limit(1);

		if (existing) {
			await db()
				.update(users)
				.set({ name: trimmedName })
				.where(eq(users.id, existing.id));
			return existing.id as User.UserId;
		}
	}

	const id = nanoId() as User.UserId;
	await db()
		.insert(users)
		.values({
			id,
			name: trimmedName,
			email: `guest-${id}@${GUEST_EMAIL_DOMAIN}`,
		});

	cookieStore.set(GUEST_COOKIE_NAME, id, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
	});

	return id;
}

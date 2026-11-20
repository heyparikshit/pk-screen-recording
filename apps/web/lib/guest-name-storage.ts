export const GUEST_NAME_STORAGE_KEY = "cap_guest_name";

/** Best-effort: private browsing / blocked storage just means re-asking. */
export function readStoredGuestName(): string {
	try {
		return window.localStorage.getItem(GUEST_NAME_STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

export function writeStoredGuestName(name: string): void {
	try {
		window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, name);
	} catch {
		// Ignore — the name just won't be remembered for next time.
	}
}

import { serverEnv } from "@cap/env";

export type TranscriptionProvider = "assemblyai" | "deepgram";

/**
 * AssemblyAI is checked first so existing self-hosted deployments that set
 * both keys keep their current (AssemblyAI) behavior unchanged.
 */
export function getTranscriptionProvider(): TranscriptionProvider | null {
	const env = serverEnv();
	if (env.ASSEMBLY_API_KEY) return "assemblyai";
	if (env.DEEPGRAM_API_KEY) return "deepgram";
	return null;
}

export function isTranscriptionConfigured(): boolean {
	return getTranscriptionProvider() !== null;
}

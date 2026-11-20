import { serverEnv } from "@cap/env";
import {
	AI_GENERATION_LANGUAGE_AUTO,
	type AiGenerationLanguage,
} from "@cap/web-domain";
import type { AssemblyAIEditResult } from "@/lib/edit-transcript";

const DEEPGRAM_MODEL = "nova-3";
const DEEPGRAM_LISTEN_URL = "https://api.deepgram.com/v1/listen";

type DeepgramWord = {
	word?: unknown;
	punctuated_word?: unknown;
	start?: unknown;
	end?: unknown;
	confidence?: unknown;
	speaker?: unknown;
};

type DeepgramResponse = {
	metadata?: { duration?: unknown };
	results?: {
		channels?: {
			detected_language?: unknown;
			alternatives?: { words?: DeepgramWord[] }[];
		}[];
	};
};

export type DeepgramTranscriptionResult = AssemblyAIEditResult & {
	audio_duration: number;
};

function buildListenUrl(language: AiGenerationLanguage): string {
	const params = new URLSearchParams({
		model: DEEPGRAM_MODEL,
		smart_format: "true",
		punctuate: "true",
		diarize: "true",
	});

	if (language === AI_GENERATION_LANGUAGE_AUTO) {
		params.set("detect_language", "true");
	} else {
		params.set("language", language);
	}

	const base = serverEnv().DEEPGRAM_BASE_URL || DEEPGRAM_LISTEN_URL;
	return `${base}?${params.toString()}`;
}

/**
 * Transcribes with Deepgram's prerecorded ("batch") API and maps the result
 * into the same shape AssemblyAI's transcript object has, so it can be fed
 * straight into `createEditTranscript` — the caption/edit-transcript pipeline
 * downstream never has to know which provider ran.
 */
export async function transcribeWithDeepgramApi(
	audioBuffer: Buffer,
	contentType: string,
	language: AiGenerationLanguage,
): Promise<DeepgramTranscriptionResult> {
	const apiKey = serverEnv().DEEPGRAM_API_KEY;
	if (!apiKey) throw new Error("Missing DEEPGRAM_API_KEY");

	const response = await fetch(buildListenUrl(language), {
		method: "POST",
		headers: {
			Authorization: `Token ${apiKey}`,
			"Content-Type": contentType || "audio/mpeg",
		},
		body: audioBuffer,
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`Deepgram transcription failed (status=${response.status}): ${body.slice(0, 500)}`,
		);
	}

	const json = (await response.json()) as DeepgramResponse;
	const channel = json.results?.channels?.[0];
	const words = channel?.alternatives?.[0]?.words ?? [];
	const durationSeconds =
		typeof json.metadata?.duration === "number" ? json.metadata.duration : 0;

	return {
		audio_duration: durationSeconds,
		language_code:
			language === AI_GENERATION_LANGUAGE_AUTO
				? (channel?.detected_language ?? null)
				: language,
		speech_model_used: DEEPGRAM_MODEL,
		words: words.map((word) => {
			const text =
				typeof word.punctuated_word === "string"
					? word.punctuated_word
					: typeof word.word === "string"
						? word.word
						: "";
			const startSeconds =
				typeof word.start === "number" ? word.start : undefined;
			const endSeconds = typeof word.end === "number" ? word.end : undefined;

			return {
				text,
				start:
					startSeconds === undefined ? undefined : Math.round(startSeconds * 1000),
				end: endSeconds === undefined ? undefined : Math.round(endSeconds * 1000),
				confidence:
					typeof word.confidence === "number" ? word.confidence : undefined,
				speaker:
					typeof word.speaker === "number" ? String(word.speaker) : undefined,
				channel: undefined,
			};
		}),
	};
}

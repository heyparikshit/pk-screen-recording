"use server";

import { db } from "@cap/database";
import { nanoId } from "@cap/database/helpers";
import { comments, videos } from "@cap/database/schema";
import { provideOptionalAuth, VideosPolicy } from "@cap/web-backend";
import { Comment, Policy, type Video } from "@cap/web-domain";
import { eq } from "drizzle-orm";
import { Effect, Exit } from "effect";
import { revalidatePath } from "next/cache";
import {
	COMMENT_RATE_LIMITED_MESSAGE,
	isCommentRateLimited,
} from "@/lib/comment-rate-limit";
import { isReplyParentOnVideo } from "@/lib/comment-reply-parent";
import { resolveGuestCommenter } from "@/lib/guest-identity";
import { createNotification } from "@/lib/Notification";
import * as EffectRuntime from "@/lib/server";
import { isVideoFeedbackDisabled } from "@/lib/video-feedback-rules";

/**
 * Lets a viewer with no Cap account leave a text comment or emoji reaction,
 * no sign-in required. See `resolveGuestCommenter` for how an (optional, for
 * reactions) name becomes a non-login-capable author identity that the rest
 * of the comment system already knows how to render. Deliberately limited to
 * text/emoji: recording a video/audio reply still requires a real account
 * (newComment / media-comment routes).
 */
export async function guestComment(data: {
	content: string;
	videoId: Video.VideoId;
	/** Omitted for reactions, which post silently under "Guest". */
	guestName?: string;
	type: "text" | "emoji";
	parentCommentId: Comment.CommentId;
	timestamp: number | null;
}) {
	const content = data.content;
	const videoId = data.videoId;
	const type = data.type;
	const parentCommentId = data.parentCommentId;
	const timestamp = data.timestamp;
	const conditionalType = parentCommentId
		? "reply"
		: type === "emoji"
			? "reaction"
			: "comment";

	if (!content || !videoId) {
		throw new Error("Content and videoId are required");
	}

	const authorId = await resolveGuestCommenter(data.guestName);

	if (await isCommentRateLimited(authorId)) {
		throw new Error(COMMENT_RATE_LIMITED_MESSAGE);
	}

	// Mirrors newComment's access check: authentication (or, here, a resolved
	// guest identity) alone isn't authorization to comment on someone else's
	// private video by guessing its id.
	const accessExit = await Effect.gen(function* () {
		const videosPolicy = yield* VideosPolicy;
		return yield* Effect.promise(() =>
			db()
				.select({ id: videos.id })
				.from(videos)
				.where(eq(videos.id, videoId))
				.limit(1),
		).pipe(Policy.withPublicPolicy(videosPolicy.canView(videoId)));
	}).pipe(provideOptionalAuth, EffectRuntime.runPromiseExit);

	if (Exit.isFailure(accessExit)) {
		console.error("Video access check failed:", accessExit);
		throw new Error("Video not found");
	}

	if (accessExit.value.length === 0) {
		throw new Error("Video not found");
	}

	if (
		await isVideoFeedbackDisabled(
			videoId,
			conditionalType === "reaction" ? "disableReactions" : "disableComments",
		)
	)
		throw new Error("Feedback is disabled on this video");

	if (
		parentCommentId &&
		!(await isReplyParentOnVideo(parentCommentId, videoId))
	)
		throw new Error("Comment not found");

	const id = Comment.CommentId.make(nanoId());

	const newCommentRow = {
		id,
		authorId,
		type,
		content,
		videoId,
		timestamp: timestamp ?? null,
		parentCommentId,
		mediaKey: null,
		mediaDuration: null,
		mediaMeta: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	await db().insert(comments).values(newCommentRow);

	try {
		await createNotification({
			type: conditionalType,
			videoId,
			authorId,
			comment: { id, content },
			parentCommentId,
		});
	} catch (error) {
		console.error("Failed to create notification:", error);
	}

	const commentWithAuthor = {
		...newCommentRow,
		authorName: data.guestName?.trim().slice(0, 100) || "Guest",
		authorImage: null,
		sending: false,
	};

	revalidatePath(`/s/${videoId}`);

	return commentWithAuthor;
}

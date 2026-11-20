"use client";

import type { Video } from "@cap/web-domain";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/app/Layout/AuthContext";
import { SignedImageUrl } from "@/components/SignedImageUrl";
import {
	readStoredGuestName,
	writeStoredGuestName,
} from "@/lib/guest-name-storage";
import type { CommentType } from "../../../Share";
import { RecordActionButtons } from "../../media-comment/record-actions";
import { useOptionalPlayback } from "../../playback/PlaybackContext";
import type { RecordIntentKind } from "../../timeline/TimelineComposer";
import CommentInput from "./CommentInput";

// Same deal as the timeline: capture and upload code only loads once someone
// presses record.
const RecorderSurface = dynamic(
	() => import("../../timeline/recording/RecorderSurface"),
	{ ssr: false },
);

interface ActivityComposerProps {
	videoId: Video.VideoId;
	/** Whose video this is, for the placeholder. */
	ownerName?: string | null;
	disabled?: boolean;
	onSubmit: (content: string) => void | Promise<void>;
	/** No sign-in: just a name, posted as that name instead of a real account. */
	onGuestSubmit: (content: string, guestName: string) => void | Promise<void>;
	/** Owner is on Pro and the viewer is signed in; the upload path re-checks. */
	canRecordMedia?: boolean;
	onOptimisticComment?: (comment: CommentType) => void;
	onCommentSuccess?: (comment: CommentType) => void;
}

/**
 * The panel's composer, pinned above the comment list. Leading with it (rather
 * than parking it under the scroll) means the primary action is the first thing
 * in the sidebar and an empty panel reads as an invitation.
 */
export function ActivityComposer({
	videoId,
	ownerName,
	disabled,
	onSubmit,
	onGuestSubmit,
	canRecordMedia = false,
	onOptimisticComment,
	onCommentSuccess,
}: ActivityComposerProps) {
	const user = useCurrentUser();
	const playback = useOptionalPlayback();
	const [recordIntent, setRecordIntent] = useState<{
		kind: RecordIntentKind;
		t: number;
	} | null>(null);
	const [guestName, setGuestName] = useState("");

	useEffect(() => {
		if (!user) setGuestName(readStoredGuestName());
	}, [user]);

	const startRecording = useCallback(
		(kind: RecordIntentKind) => {
			// Anchor to wherever the viewer is watching, same as a text comment,
			// and get out of the way of whatever they are about to record.
			const t = playback?.getCurrentTime() ?? 0;
			playback?.pause();
			setRecordIntent({ kind, t });
		},
		[playback],
	);

	// Signed out: no sign-in required to comment — just a name, remembered in
	// this browser via localStorage so it isn't asked again every time.
	if (!user) {
		return (
			<CommentInput
				collapsible
				onSubmit={(content) => {
					writeStoredGuestName(guestName);
					return onGuestSubmit(content, guestName);
				}}
				disabled={disabled}
				placeholder={ownerName ? `Respond to ${ownerName}...` : "Leave a comment"}
				buttonLabel="Comment"
				guestName={guestName}
				onGuestNameChange={setGuestName}
			/>
		);
	}

	return (
		<>
			<CommentInput
				collapsible
				onSubmit={onSubmit}
				disabled={disabled}
				placeholder={
					ownerName ? `Respond to ${ownerName}...` : "Leave a comment"
				}
				buttonLabel="Comment"
				avatar={
					<SignedImageUrl
						image={user.imageUrl}
						name={user.name ?? "You"}
						className="size-7 rounded-full"
						letterClass="text-[11px] font-medium"
					/>
				}
				actions={
					canRecordMedia ? (
						<RecordActionButtons
							disabled={disabled}
							onSelect={startRecording}
						/>
					) : null
				}
			/>

			{recordIntent && (
				<RecorderSurface
					kind={recordIntent.kind}
					timestamp={recordIntent.t}
					videoId={videoId}
					onOptimisticComment={onOptimisticComment}
					onCommentSuccess={onCommentSuccess}
					onClose={() => setRecordIntent(null)}
					// The sidebar's tab pane clips overflow; an anchored card would
					// render above it, invisible (with a very live microphone).
					placement="floating"
				/>
			)}
		</>
	);
}

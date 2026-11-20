import { useId } from "react";
import { BrandMark } from "./BrandMark";

export const LogoBadge = ({ className }: { className: string }) => {
	const gradientId = `brand-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="PK's Screen Recording"
			fill="none"
			viewBox="0 0 40 40"
			preserveAspectRatio="xMidYMid meet"
			style={{
				aspectRatio: "1 / 1",
			}}
		>
			<BrandMark gradientId={gradientId} />
		</svg>
	);
};

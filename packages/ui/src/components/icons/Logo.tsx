import { useId } from "react";
import { BrandMark } from "./BrandMark";

export const Logo = ({
	className,
	showVersion,
	showBeta,
	white,
	hideLogoName,
	viewBoxDimensions = "0 0 120 40",
	style,
}: {
	className?: string;
	showVersion?: boolean;
	showBeta?: boolean;
	white?: boolean;
	hideLogoName?: boolean;
	style?: React.CSSProperties;
	viewBoxDimensions?: `${string} ${string} ${string} ${string}`;
}) => {
	const gradientId = `brand-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

	return (
		<div className="flex items-center">
			<svg
				viewBox={viewBoxDimensions}
				xmlns="http://www.w3.org/2000/svg"
				preserveAspectRatio="xMidYMid meet"
				fill="none"
				style={style}
				role="img"
				aria-label="PK's Screen Recording Logo"
				className={className}
			>
				<BrandMark gradientId={gradientId} />
				{!hideLogoName && (
					<text
						x="48"
						y="27"
						fontFamily="Arial, Helvetica, sans-serif"
						fontWeight="700"
						fontSize="21"
						className={white ? undefined : "fill-gray-12"}
						fill={white ? "#F5F7FA" : undefined}
					>
						PK
					</text>
				)}
			</svg>
			{showVersion && (
				<span
					className={`text-[10px] font-medium ${
						white ? "text-white" : "text-gray-1"
					}`}
				>
					v{process.env.appVersion}
				</span>
			)}
			{showBeta && (
				<span
					className={`text-[10px] font-medium min-w-[52px] ${
						white ? "text-white" : "text-gray-1"
					}`}
				>
					Beta v{process.env.appVersion}
				</span>
			)}
		</div>
	);
};

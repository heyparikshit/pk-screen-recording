// Custom brand mark for this self-hosted deployment, drawn as plain SVG
// primitives so it stays legible down to 16x16 favicon size.
export const BrandMark = ({ gradientId }: { gradientId: string }) => (
	<>
		<defs>
			<linearGradient
				id={gradientId}
				x1="0"
				y1="0"
				x2="40"
				y2="40"
				gradientUnits="userSpaceOnUse"
			>
				<stop offset="0" stopColor="#5B8DEF" />
				<stop offset="1" stopColor="#1E3A8A" />
			</linearGradient>
		</defs>
		<rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${gradientId})`} />
		<circle cx="30" cy="10" r="5" fill="#FF4D4F" />
		<circle
			cx="30"
			cy="10"
			r="5"
			fill="none"
			stroke="#ffffff"
			strokeOpacity="0.35"
			strokeWidth="1"
		/>
		<text
			x="17"
			y="29"
			textAnchor="middle"
			fontFamily="Arial, Helvetica, sans-serif"
			fontWeight="700"
			fontSize="21"
			fill="#ffffff"
		>
			P
		</text>
	</>
);

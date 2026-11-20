import type { Metadata } from "next";
import { RecordVideoPage } from "./RecordVideoPage";

export const metadata: Metadata = {
	title: "Record a Shot",
};

export default function RecordVideoRoute() {
	return <RecordVideoPage />;
}

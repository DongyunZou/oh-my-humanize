const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const review = state.review;
const patch = state.patch && typeof state.patch === "object" ? state.patch : {};
const priorFeedback = priorReviewFeedback(review);
const resolvedReviewFeedback = resolvedReviewFeedbackFromPatch(patch);

if (priorFeedback && resolvedReviewFeedback.length === 0) {
	throw new Error(
		[
			"documentation patch did not resolve prior reviewer feedback",
			`prior feedback: ${truncateText(priorFeedback, 600)}`,
			"patch must include resolved_review_feedback evidence before validation can run",
		].join("; "),
	);
}

const artifactPath = "workflow-output/documentation-review-repair.md";
await Bun.write(
	artifactPath,
	[
		"# Documentation Review Repair Guard",
		"",
		`priorFeedbackRequired: ${priorFeedback ? "yes" : "no"}`,
		"",
		"## Resolved Review Feedback",
		"",
		resolvedReviewFeedback.length > 0
			? resolvedReviewFeedback.map(item => `- ${item}`).join("\n")
			: "No prior continue review required explicit repair evidence.",
		"",
	].join("\n"),
);

return {
	summary: priorFeedback
		? "prior review feedback has explicit patch resolution evidence"
		: "no prior continue review feedback requires repair evidence",
	statePatch: [
		{
			op: "set",
			path: "/reviewRepair",
			value: {
				status: "pass",
				file: artifactPath,
				priorFeedbackRequired: Boolean(priorFeedback),
				resolvedReviewFeedback,
			},
		},
	],
};

function priorReviewFeedback(value) {
	if (typeof value !== "string") return "";
	const text = value.trim();
	if (!text) return "";
	if (/^no previous documentation review yet\.?$/iu.test(text)) return "";
	if (/\bcontinue\b/iu.test(text)) return text;
	if (/\b(missing|stale|too broad|not validated|fails to address|restore|regression|unresolved)\b/iu.test(text)) {
		return text;
	}
	return "";
}

function resolvedReviewFeedbackFromPatch(value) {
	const field = value.resolved_review_feedback ?? value.resolvedReviewFeedback;
	if (Array.isArray(field)) return field.map(reviewFeedbackItemText).filter(Boolean);
	if (typeof field === "string" && field.trim()) return [field.trim()];
	return [];
}

function reviewFeedbackItemText(item) {
	if (typeof item === "string") return item.trim();
	if (!item || typeof item !== "object") return "";
	const feedback = typeof item.feedback === "string" ? item.feedback.trim() : "";
	const evidence = typeof item.evidence === "string" ? item.evidence.trim() : "";
	if (feedback && evidence) return `${feedback} — ${evidence}`;
	return feedback || evidence;
}

function truncateText(text, maxLength) {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, Math.max(0, maxLength - 64))}...[truncated ${text.length - maxLength} chars]`;
}

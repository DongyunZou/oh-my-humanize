import { describe, expect, it } from "bun:test";
import { APP_NAME } from "@oh-my-pi/pi-utils";
import codingAgentPackage from "../package.json" with { type: "json" };

describe("Oh My Humanize public branding", () => {
	it("uses omh as the primary CLI name", () => {
		expect(APP_NAME).toBe("omh");
	});

	it("publishes omh as the primary bin while preserving omp as a compatibility alias", () => {
		expect(codingAgentPackage.bin).toEqual(
			expect.objectContaining({
				omh: "src/cli.ts",
				omp: "src/cli.ts",
			}),
		);
	});

	it("points public package metadata at omh.sh", () => {
		expect(codingAgentPackage.homepage).toBe("https://omh.sh");
		expect(codingAgentPackage.description).toContain("Oh My Humanize");
	});
});

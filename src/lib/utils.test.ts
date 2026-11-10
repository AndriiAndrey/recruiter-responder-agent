import { describe, expect, it } from "vitest";

import { cn } from "./utils.ts";

describe("cn", () => {
	it("joins class strings", () => {
		expect(cn("flex", "items-center")).toBe("flex items-center");
	});

	it("resolves tailwind conflicts with the later class", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
	});

	it("drops falsy values", () => {
		expect(cn("p-2", undefined, false && "m-1", "m-1")).toBe("p-2 m-1");
	});
});

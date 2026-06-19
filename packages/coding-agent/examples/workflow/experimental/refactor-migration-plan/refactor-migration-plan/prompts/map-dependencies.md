Use the task contract below as the authoritative migration scope.

Task:

{{jsonStringify task}}

Map the dependency surface for the requested refactor. Identify public APIs,
callers, tests, compatibility boundaries, rollout hazards, and files that must
not be changed. Prefer a migration plan over a rewrite.

Return a concise structured dependency map with risk ranking and focused
validation needs. Do not invent a new validation command.

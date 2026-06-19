Design the compatibility strategy for this refactor migration.

Task:

{{jsonStringify task}}

Dependency map:

{{jsonStringify dependencyMap}}

Choose the smallest compatibility layer, shim, adapter, staged migration, or
test-preserving strategy that can move callers safely. Specify what behavior
must remain unchanged, what can be removed only after validation, and rollback
notes.

# Agent Contract (Staff repo)

DEFAULT: READ-ONLY.
WRITE allowed ONLY when the user message contains this exact token:
WRITE: I authorize file edits

NEVER:
- Touch the Client repo.
- Replace external client flows with local detours.
- Delete data/files. S3-only storage is mandatory; no local fs writes.

ALWAYS:
- Show console output for every command.
- Report each change (file path + lines changed).
- Stop on error; report; do not add "workarounds".

Policy Numbers:
- BF (Boreal Financial) communications FROM: +18254511768
- SLF (Site Level Financial) voice number: +17753146801
- Human approval SMS number (must approve before contacting clients): +15878881837
# Work Log Rule

After completing any of the following, remind the user to update the work log (`.amazonq/prompts/work_log.md`):
- Creating a new script or file
- Finishing a significant code change or bug fix
- Completing a comparison run or test
- Adding new table mappings or column overrides

The reminder should be brief, like:
> Want me to update the `@work_log` with what we just did?

If the user says yes, append a new session entry or update today's existing entry in `.amazonq/prompts/work_log.md` with:
- What was worked on (brief)
- Files created/modified
- Status (in progress / done)
- Next steps

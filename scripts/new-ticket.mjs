#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [id, ...titleParts] = process.argv.slice(2);
if (!id || titleParts.length === 0) {
  console.error("Usage: npm run ticket:new T-013 \"Short title\"");
  process.exit(1);
}
const title = titleParts.join(" ");
const today = new Date().toISOString().slice(0, 10);

const ticketsDir = path.join("tickets");
fs.mkdirSync(ticketsDir, { recursive: true });

const body = `● ${id} — ${title}

Goal
Describe the user-visible outcome in one sentence.

Scope
- List the parts of the app/files that will change
- Explicit out-of-scope list

Acceptance criteria
- [ ] AC1 …
- [ ] AC2 …
- [ ] AC3 …

Math/logic spec (if any)
- Formulas / invariants / edge cases

UI notes
- Placement, copy, states
- Screenshots to capture

Tests
- Unit:
- Integration:
- Golden:

Manual validation script
1) …
2) …
3) …

Rollback
- Revert commit ${id}, no migrations.
`;

const ticketPath = path.join(ticketsDir, `${id}.md`);
fs.writeFileSync(ticketPath, body, "utf8");
console.log(`Created ${ticketPath}`);

const changelogLine = `- ${today} ${id} — ${title} (opened)\n`;
fs.appendFileSync("CHANGELOG.md", changelogLine, "utf8");
/**
 * Split a skill markdown file into frontmatter and body.
 *
 * Only a `---` block at the very start of the file (after optional leading
 * whitespace) is treated as frontmatter. Once the closing `---` is found, all
 * subsequent `---` lines are body content (e.g. horizontal rules) and are
 * preserved instead of being absorbed into the discarded frontmatter buffer.
 */
export function parseSkillFrontmatter(content: string): {
  frontmatter: string;
  body: string;
} {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: "", body: content };
  }

  const lines = trimmed.split("\n");
  let closingIndex = -1;

  // Find the FIRST closing '---' after the opening delimiter.
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    // No closing delimiter, treat entire content as body.
    return { frontmatter: "", body: content };
  }

  const frontmatter = lines.slice(1, closingIndex).join("\n");
  const body = lines
    .slice(closingIndex + 1)
    .join("\n")
    .trimStart();

  return { frontmatter, body };
}

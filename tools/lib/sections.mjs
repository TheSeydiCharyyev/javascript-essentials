// Section of a page in the MDN JavaScript map, e.g. "Guide", "Reference/Operators",
// "Global_Objects (members)". Used for summaries by coverage-export and coverage-check.
const GROUPS = ['Errors', 'Operators', 'Statements', 'Regular_expressions', 'Functions', 'Classes'];

export function jsSection(slug) {
  const p = slug.split('/').slice(2); // drop "Web/JavaScript"
  if (p.length === 0) return 'root page';
  if (p[0] === 'Guide') return 'Guide';
  if (p.length === 1) return 'Reference (root page)';
  if (p[1] === 'Global_Objects') {
    if (p.length === 2) return 'Global_Objects (overview)';
    return p.length === 3 ? 'Global_Objects (objects)' : p.length === 4 ? 'Global_Objects (members)' : 'Global_Objects (deeper)';
  }
  if (GROUPS.includes(p[1])) return `Reference/${p[1]}`;
  return p.length === 2 ? 'Reference (single pages)' : `Reference/${p[1]}`;
}

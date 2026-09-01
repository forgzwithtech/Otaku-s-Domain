// src/utils/gender.ts
export function needsGenderDeclaration(profile: Record<string, any> | null): boolean {
  if (!profile) return false;
  // Backend may return `gender` or `Gender` depending on JSON casing config — check both.
  const raw = profile.gender ?? profile.Gender ?? "";
  const g = String(raw).trim().toLowerCase();
  return g === "" || g === "unspecified" || g === "none" || g === "null";
}
import type { Lang } from "@/lib/locale";

export type DictionaryTree = {
  readonly [key: string]: string | DictionaryTree;
};

export type NamedDictionary = { name: string; tree: DictionaryTree };

export type DictionaryIssue =
  | { kind: "missingKey"; path: string; missingIn: string }
  | { kind: "textGroupMismatch"; path: string }
  | { kind: "emptyText"; path: string; dictionary: string };

// String.prototype.trim strips Unicode white space, including the no-break space (U+00A0).
function isBlank(text: string): boolean {
  return text.trim() === "";
}

function hasOwnKey(tree: DictionaryTree, key: string): boolean {
  return Object.hasOwn(tree, key);
}

function joinPath(parent: string, key: string): string {
  return parent === "" ? key : parent + "." + key;
}

// Keys of the first tree in their order, then the keys only the second one has.
function unionKeys(first: DictionaryTree, second: DictionaryTree): string[] {
  const keys = Object.keys(first);
  for (const key of Object.keys(second)) {
    if (!hasOwnKey(first, key)) {
      keys.push(key);
    }
  }
  return keys;
}

// A missing group is reported together with every key it holds, at every level, so whoever
// fixes the dictionary sees each key to add.
function collectMissing(
  value: string | DictionaryTree,
  path: string,
  missingIn: string,
  issues: DictionaryIssue[],
): void {
  issues.push({ kind: "missingKey", path, missingIn });
  if (typeof value === "string") {
    return;
  }
  for (const key of Object.keys(value)) {
    collectMissing(value[key], joinPath(path, key), missingIn, issues);
  }
}

// A value that cannot be compared (missing on the other side or a text/group conflict)
// is still checked for empty texts, so one run reports every issue.
function collectEmpty(
  value: string | DictionaryTree,
  path: string,
  dictionary: string,
  issues: DictionaryIssue[],
): void {
  if (typeof value === "string") {
    if (isBlank(value)) {
      issues.push({ kind: "emptyText", path, dictionary });
    }
    return;
  }
  for (const key of Object.keys(value)) {
    collectEmpty(value[key], joinPath(path, key), dictionary, issues);
  }
}

export function compareDictionaries(
  a: NamedDictionary,
  b: NamedDictionary,
): DictionaryIssue[] {
  const issues: DictionaryIssue[] = [];

  function walk(x: DictionaryTree, y: DictionaryTree, parent: string): void {
    for (const key of unionKeys(x, y)) {
      const path = joinPath(parent, key);
      if (!hasOwnKey(x, key)) {
        collectMissing(y[key], path, a.name, issues);
        collectEmpty(y[key], path, b.name, issues);
        continue;
      }
      if (!hasOwnKey(y, key)) {
        collectMissing(x[key], path, b.name, issues);
        collectEmpty(x[key], path, a.name, issues);
        continue;
      }
      const valueX = x[key];
      const valueY = y[key];
      if (typeof valueX === "string" && typeof valueY === "string") {
        if (isBlank(valueX)) {
          issues.push({ kind: "emptyText", path, dictionary: a.name });
        }
        if (isBlank(valueY)) {
          issues.push({ kind: "emptyText", path, dictionary: b.name });
        }
      } else if (typeof valueX !== "string" && typeof valueY !== "string") {
        walk(valueX, valueY, path);
      } else {
        issues.push({ kind: "textGroupMismatch", path });
        collectEmpty(valueX, path, a.name, issues);
        collectEmpty(valueY, path, b.name, issues);
      }
    }
  }

  walk(a.tree, b.tree, "");
  return issues;
}

export function selectDictionary<T>(
  lang: Lang,
  dictionaries: Readonly<Record<Lang, T>>,
): T {
  return dictionaries[lang];
}

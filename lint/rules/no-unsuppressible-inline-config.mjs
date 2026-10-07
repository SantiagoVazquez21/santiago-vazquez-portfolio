// Fails on any inline config comment (/* eslint ... */) that names an unsuppressible
// rule, whatever it sets (RF-15, plan section 4.8). It reads the comments itself, so it
// also reports in pass 2, where ESLint ignores inline config (D10).

// Matches "eslint" followed by a space or the end, so eslint-disable*, eslint-enable
// and eslint-env are left out.
const INLINE_CONFIG = /^\s*eslint(?=\s|$)([\s\S]*)$/u;
const JUSTIFICATION = /\s--\s/u;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

// A rule key: after the start, a space, a comma, { or a quote, and before an optional
// quote and ":".
function ruleKeyPattern(ruleId) {
  return new RegExp(`(?:^|[\\s,{"'])${escapeRegExp(ruleId)}["']?\\s*:`, "u");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline config comments that change an unsuppressible rule",
    },
    schema: [
      {
        type: "object",
        properties: {
          rules: { type: "array", items: { type: "string" } },
        },
        required: ["rules"],
        additionalProperties: false,
      },
    ],
    messages: {
      unsuppressible:
        "Inline config may not change the unsuppressible rule '{{ruleId}}'.",
    },
  },
  create(context) {
    const patterns = context.options[0].rules.map((ruleId) => [
      ruleId,
      ruleKeyPattern(ruleId),
    ]);
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type !== "Block") {
            continue;
          }
          const match = INLINE_CONFIG.exec(comment.value);
          if (match === null) {
            continue;
          }
          const [body] = match[1].split(JUSTIFICATION);
          for (const [ruleId, pattern] of patterns) {
            if (pattern.test(body)) {
              context.report({
                loc: comment.loc,
                messageId: "unsuppressible",
                data: { ruleId },
              });
            }
          }
        }
      },
    };
  },
};

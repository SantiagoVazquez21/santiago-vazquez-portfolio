// Local ESLint plugin "local": the project's own rules (plan, section 2).
import noHardcodedText from "./rules/no-hardcoded-text.mjs";
import noUnsuppressibleInlineConfig from "./rules/no-unsuppressible-inline-config.mjs";

export default {
  meta: { name: "local" },
  rules: {
    "no-hardcoded-text": noHardcodedText,
    "no-unsuppressible-inline-config": noUnsuppressibleInlineConfig,
  },
};

import path from "node:path";

// Fails on every literal with visible characters in a component, and on every number used
// as the content of the markup, because the lint cannot know which literal reaches the
// screen (RF-16, plan section 4.7). Only the technical exceptions of the spec are allowed.

// JavaScript's \s includes U+00A0, so a literal made only of blanks is never reported
// (technical exception 6).
const VISIBLE = /\S/u;

// Lowercase without a hyphen: a native HTML element, whose attributes HTML defines (D18).
// Own components, <x.div>, <svg:rect> and custom elements like <my-card> may render them.
const NATIVE_ELEMENT_NAME = /^[a-z][a-z0-9]*$/u;
// React consumes key, so it never reaches the element or the component.
const ANY_ELEMENT_ATTRIBUTES = new Set(["key"]);
// aria-label, alt, title and placeholder are visible text: never on any list.
const NATIVE_ONLY_ATTRIBUTES = new Set([
  "className",
  "href",
  "lang",
  "id",
  "type",
  "rel",
  "target",
  "role",
  "htmlFor",
  "aria-current",
  "aria-hidden",
  "aria-labelledby",
  "aria-describedby",
]);
const META_ONLY_ATTRIBUTES = new Set(["name", "property"]);
// Route segment options that Next reads from src/app/ (technical exception 5).
const ROUTE_CONFIG_EXPORTS = new Set([
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
]);
const MODULE_SOURCE_PARENTS = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportAllDeclaration",
  "ImportExpression",
]);
// Type positions do not exist at run time (technical exception 2).
const TYPE_NODES = new Set([
  "TSLiteralType",
  "TSTypeAnnotation",
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeParameterInstantiation",
  "TSTypeParameterDeclaration",
  "TSPropertySignature",
  "TSIndexedAccessType",
  "TSImportType",
  "TSExternalModuleReference",
]);
const KEY_PARENTS = new Set([
  "Property",
  "PropertyDefinition",
  "MethodDefinition",
]);

function hasVisibleText(text) {
  return typeof text === "string" && VISIBLE.test(text);
}

function attributeName(attribute) {
  const { name } = attribute;
  return name.type === "JSXNamespacedName"
    ? `${name.namespace.name}:${name.name.name}`
    : name.name;
}

function isAllowed(attribute) {
  const name = attributeName(attribute);
  if (ANY_ELEMENT_ATTRIBUTES.has(name)) {
    return true;
  }
  const element = attribute.parent.name;
  if (
    element.type !== "JSXIdentifier" ||
    !NATIVE_ELEMENT_NAME.test(element.name)
  ) {
    return false;
  }
  if (NATIVE_ONLY_ATTRIBUTES.has(name)) {
    return true;
  }
  return META_ONLY_ATTRIBUTES.has(name) && element.name === "meta";
}

// Only forms the lint can follow without guessing (technical exception 4): the direct
// value, a branch of a conditional or a logical operand, written in the attribute itself.
// A condition, a call, +, an array, an object, a variable or a ${} stops the walk.
function reachesAllowedAttribute(node) {
  let current = node;
  for (;;) {
    const parent = current.parent;
    if (parent.type === "JSXAttribute" && parent.value === current) {
      return isAllowed(parent);
    }
    if (
      parent.type === "JSXExpressionContainer" &&
      parent.parent.type === "JSXAttribute"
    ) {
      return isAllowed(parent.parent);
    }
    if (
      parent.type === "ConditionalExpression" &&
      (parent.consequent === current || parent.alternate === current)
    ) {
      current = parent;
      continue;
    }
    if (
      parent.type === "LogicalExpression" &&
      (parent.left === current || parent.right === current)
    ) {
      current = parent;
      continue;
    }
    return false;
  }
}

// Technical exception 1: module paths and directives such as "use client".
function isModuleSourceOrDirective(node) {
  const parent = node.parent;
  if (MODULE_SOURCE_PARENTS.has(parent.type) && parent.source === node) {
    return true;
  }
  return (
    parent.type === "ExpressionStatement" &&
    typeof parent.directive === "string"
  );
}

function isInTypePosition(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (TYPE_NODES.has(current.type)) {
      return true;
    }
  }
  return false;
}

// Technical exception 3: the key itself, never its value.
function isKey(node) {
  const parent = node.parent;
  if (KEY_PARENTS.has(parent.type) && parent.key === node) {
    return true;
  }
  return (
    parent.type === "MemberExpression" &&
    parent.computed &&
    parent.property === node
  );
}

// Technical exception 5: the literal, or an array of literals, is the whole initial value
// of an `export const` named after a route option, in a file under src/app/.
function isRouteConfigValue(node, inApp) {
  if (!inApp) {
    return false;
  }
  const value = node.parent.type === "ArrayExpression" ? node.parent : node;
  const declarator = value.parent;
  if (
    declarator.type !== "VariableDeclarator" ||
    declarator.init !== value ||
    declarator.id.type !== "Identifier" ||
    !ROUTE_CONFIG_EXPORTS.has(declarator.id.name)
  ) {
    return false;
  }
  const declaration = declarator.parent;
  return (
    declaration.kind === "const" &&
    declaration.parent.type === "ExportNamedDeclaration"
  );
}

function isExempt(node, inApp) {
  return (
    isModuleSourceOrDirective(node) ||
    isInTypePosition(node) ||
    isKey(node) ||
    isRouteConfigValue(node, inApp) ||
    reachesAllowedAttribute(node)
  );
}

// A number is visible only as a child of the markup, directly or as a possible result of
// a conditional or logical expression: <p>{42}</p>, <p>{c ? 1 : 2}</p>.
function isMarkupContent(node) {
  let current = node;
  for (;;) {
    const parent = current.parent;
    if (
      parent.type === "ConditionalExpression" ||
      parent.type === "LogicalExpression"
    ) {
      current = parent;
      continue;
    }
    return (
      parent.type === "JSXExpressionContainer" &&
      (parent.parent.type === "JSXElement" ||
        parent.parent.type === "JSXFragment")
    );
  }
}

// Only the path inside the project counts, so src/components/src/app/ is not the app.
function isUnderApp(context) {
  const [first, second] = path
    .relative(context.cwd, context.filename)
    .split(path.sep);
  return first === "src" && second === "app";
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hard-coded visible text in components; take it from the dictionaries",
    },
    schema: [],
    messages: {
      hardcoded:
        "Hard-coded text {{text}} in a component: take it from the es and en dictionaries.",
    },
  },
  create(context) {
    const inApp = isUnderApp(context);

    function report(node, text) {
      context.report({ node, messageId: "hardcoded", data: { text } });
    }

    return {
      JSXText(node) {
        if (hasVisibleText(node.value)) {
          report(node, node.value.trim());
        }
      },
      Literal(node) {
        const reported =
          typeof node.value === "number"
            ? isMarkupContent(node)
            : hasVisibleText(node.value) && !isExempt(node, inApp);
        if (reported) {
          report(node, context.sourceCode.getText(node));
        }
      },
      TemplateLiteral(node) {
        if (
          node.quasis.some((quasi) => hasVisibleText(quasi.value.cooked)) &&
          !isExempt(node, inApp)
        ) {
          report(node, context.sourceCode.getText(node));
        }
      },
    };
  },
};

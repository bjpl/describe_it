/**
 * ESLint Custom Rule: require-logger
 *
 * Enforces the use of the application's logger instead of console statements.
 * Provides auto-fix capabilities to convert console calls to logger calls.
 *
 * @type {import('eslint').Rule.RuleModule}
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce use of application logger instead of console',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      useLogger: 'Use logger.{{method}}() instead of console.{{method}}(). Import from "@/lib/logger" or "@/lib/monitoring/logger"',
      useLoggerCritical: 'Use logger.error() for critical errors instead of console.error()',
    },
  },

  create(context) {
    const filename = context.getFilename();

    // Skip files that are allowed to use console
    const allowedPaths = [
      /scripts\//,
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /tests\//,
      /eslint-rules\//,
      /\.config\.(ts|js|mjs|cjs)$/,
    ];

    if (allowedPaths.some(pattern => pattern.test(filename))) {
      return {};
    }

    // Map console methods to logger methods
    const consoleToLoggerMap = {
      log: 'info',
      info: 'info',
      warn: 'warn',
      error: 'error',
      debug: 'debug',
      trace: 'debug',
    };

    return {
      MemberExpression(node) {
        // Check if it's a console.* call
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          const consoleMethod = node.property.name;
          const loggerMethod = consoleToLoggerMap[consoleMethod];

          if (!loggerMethod) {
            // Unknown console method, still report it
            context.report({
              node,
              messageId: 'useLogger',
              data: {
                method: consoleMethod,
              },
            });
            return;
          }

          context.report({
            node,
            messageId: consoleMethod === 'error' ? 'useLoggerCritical' : 'useLogger',
            data: {
              method: consoleMethod,
            },
            fix(fixer) {
              // Only auto-fix if we're in a CallExpression
              const parent = node.parent;
              if (parent.type !== 'CallExpression' || parent.callee !== node) {
                return null;
              }

              // Get the full console.method() call
              const callExpression = parent;
              const args = callExpression.arguments;

              // Build the logger replacement
              let replacement;
              if (args.length === 0) {
                replacement = `logger.${loggerMethod}('')`;
              } else if (args.length === 1) {
                const arg = context.getSourceCode().getText(args[0]);
                replacement = `logger.${loggerMethod}(${arg})`;
              } else {
                // Multiple arguments - need to handle differently
                const firstArg = context.getSourceCode().getText(args[0]);
                const restArgs = args.slice(1).map(arg => context.getSourceCode().getText(arg));

                // If first arg is a string, try to create a message with context
                if (args[0].type === 'Literal' || args[0].type === 'TemplateLiteral') {
                  const contextObj = restArgs.length > 0
                    ? `, { data: [${restArgs.join(', ')}] }`
                    : '';
                  replacement = `logger.${loggerMethod}(${firstArg}${contextObj})`;
                } else {
                  // Non-string first argument
                  replacement = `logger.${loggerMethod}('', { data: [${[firstArg, ...restArgs].join(', ')}] })`;
                }
              }

              return fixer.replaceText(callExpression, replacement);
            },
          });
        }
      },
    };
  },
};

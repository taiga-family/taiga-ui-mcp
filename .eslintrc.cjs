/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
    root: true,
    extends: ['plugin:@taiga-ui/experience/all'],
    rules: {
        'import/extensions': 'off',
        'import/no-useless-path-segments': ['error', {noUselessIndex: false}],
    },
};

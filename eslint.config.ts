import taiga from '@taiga-ui/eslint-plugin-experience-next';

export default [
    ...taiga.configs.recommended,
    {
        ignores: [
            // TypeScript will ignore files with duplicate filenames in the same folder
            // (for example, src/file.ts and src/file.js). TypeScript purposely ignore
            // all but one of the files, only keeping the one file
            // with the highest priority extension
            '**/eslint.config.ts',
            '.release-it.js',
        ],
    },

    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        rules: {
            'import/extensions': 'off',
            'import/no-useless-path-segments': ['error', {noUselessIndex: false}],
        },
    },
];

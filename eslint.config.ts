import taiga from '@taiga-ui/eslint-plugin-experience-next';

export default [
    ...taiga.configs.recommended,

    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        rules: {
            'import/extensions': 'off',
            'import/no-useless-path-segments': ['error', {noUselessIndex: false}],
        },
    },
];

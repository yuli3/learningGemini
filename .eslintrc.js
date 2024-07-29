module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        'object-curly-spacing': ['error', 'always'], // Or 'never'
        'max-len': ['error', { code: 80 }],
        'quotes': ['error', 'double'], // Or 'single'
        'indent': ['error', 4], // Or 4
        'no-unused-vars': 'warn',
        'new-cap': 'warn',
        'no-trailing-spaces': 'warn',
        'require-jsdoc': 'off', // You can turn this off if you don't want JSDoc comments
        'no-inner-declarations': 'off', // You can turn this off if you want to declare functions inside blocks
        'comma-dangle': ['error', 'always-multiline'], // Or 'never'
        'semi': ['error', 'always'], // Or 'never'
        'padded-blocks': ['error', 'never'], // Or 'always'
        'eol-last': ['error', 'always'], // Or 'never'
    },
};
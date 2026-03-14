import { FlatCompat } from '@eslint/eslintrc'
import reactHooks from 'eslint-plugin-react-hooks'

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
})

export default [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
]

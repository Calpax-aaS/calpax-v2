import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),

  // Global ignores
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'v1-reference/**',
      'prisma/migrations/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  // adminDb import restriction: only lib/admin/**, app/**/admin/**, scripts/**, prisma/seed.ts
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'lib/admin/**',
      'app/**/admin/**',
      'lib/db/**',
      'scripts/**',
      'prisma/seed.ts',
      'tests/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/db',
              importNames: ['adminDb'],
              message:
                'adminDb can only be imported from lib/admin/**, app/**/admin/**, scripts/**, or prisma/seed.ts.',
            },
          ],
        },
      ],
    },
  },

  // Raw SQL restriction: ban $queryRaw* and $executeRaw* on db/adminDb outside lib/db/raw/**
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['lib/db/raw/**', 'tests/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'db', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$queryRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'db', property: '$executeRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$queryRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$queryRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        { object: 'adminDb', property: '$executeRawUnsafe', message: 'raw SQL belongs in lib/db/raw/' },
      ],
    },
  },
]

export default config

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

  // adminDb import restriction: only lib/admin/**, lib/actions/admin.ts,
  // app/**/admin/**, scripts/**, prisma/seed.ts
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'lib/admin/**',
      'lib/actions/admin.ts',
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

  // basePrisma import restriction: tenant-scoped `db` is the default. basePrisma
  // bypasses both the tenant extension and audit redaction, so it's only OK on
  // genuinely cross-tenant or untenanted models (Session, User account, FailedLoginAttempt,
  // CronInvocation, AuditLog, Verification, BilletTag join, raw sequence reads).
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'lib/admin/**',
      'lib/audit/**',
      'lib/auth.ts',
      'lib/auth/**',
      'lib/db/**',
      'lib/email/invitation.ts',
      'lib/actions/admin.ts',
      'lib/actions/billet.ts',
      'lib/actions/session.ts',
      'lib/actions/tag.ts',
      'app/**/admin/**',
      'app/api/cron/**',
      'app/**/profil/**',
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
              name: '@/lib/db/base',
              importNames: ['basePrisma'],
              message:
                'Use db from @/lib/db (tenant-scoped). basePrisma is reserved for untenanted models (Session, AuditLog, CronInvocation, BilletTag, Verification, raw sequences) — confine it to lib/auth/**, lib/audit/**, lib/email/invitation.ts, lib/actions/{admin,billet,session,tag}.ts, app/**/admin/**, app/api/cron/**, or app/**/profil/**.',
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
        {
          object: 'adminDb',
          property: '$queryRawUnsafe',
          message: 'raw SQL belongs in lib/db/raw/',
        },
        { object: 'adminDb', property: '$executeRaw', message: 'raw SQL belongs in lib/db/raw/' },
        {
          object: 'adminDb',
          property: '$executeRawUnsafe',
          message: 'raw SQL belongs in lib/db/raw/',
        },
      ],
    },
  },
]

export default config

/**
 * Meta-tests: verify ESLint restriction rules actually catch violations.
 * These tests use the ESLint programmatic API to lint known-bad fixture files
 * and assert the expected errors are reported.
 *
 * We pass overrideConfigFile: null and supply the rules via overrideConfig,
 * which bypasses the project eslint.config.mjs (and its ignores on tests/**)
 * while still applying the rules we want to validate.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

describe('ESLint restriction rules', () => {
  it('flags adminDb import outside allowed paths', async () => {
    const eslint = new ESLint({
      cwd: root,
      // null = do not auto-discover config files; rules come entirely from overrideConfig
      overrideConfigFile: null,
      overrideConfig: [
        {
          files: ['**/*.ts'],
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
      ],
    })

    const fixtureFile = path.join(root, 'tests/integration/fixtures/bad-admindb-import.ts')
    const results = await eslint.lintFiles([fixtureFile])
    const messages = results.flatMap((r) => r.messages)

    const adminDbErrors = messages.filter(
      (m) => m.ruleId === 'no-restricted-imports' && (m.message?.includes('adminDb') ?? false),
    )

    expect(adminDbErrors.length).toBeGreaterThan(0)
  })

  it('flags $queryRaw usage outside lib/db/raw/', async () => {
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: null,
      overrideConfig: [
        {
          files: ['**/*.ts'],
          rules: {
            'no-restricted-properties': [
              'error',
              {
                object: 'db',
                property: '$queryRaw',
                message: 'raw SQL belongs in lib/db/raw/',
              },
            ],
          },
        },
      ],
    })

    const fixtureFile = path.join(root, 'tests/integration/fixtures/bad-raw-sql.ts')
    const results = await eslint.lintFiles([fixtureFile])
    const messages = results.flatMap((r) => r.messages)

    const rawSqlErrors = messages.filter(
      (m) => m.ruleId === 'no-restricted-properties' && (m.message?.includes('raw SQL') ?? false),
    )

    expect(rawSqlErrors.length).toBeGreaterThan(0)
  })
})

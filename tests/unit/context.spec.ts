import { describe, it, expect } from 'vitest'
import { runWithContext, getContext, tryGetContext } from '@/lib/context'

const sampleCtx = {
  userId: 'user_1',
  exploitantId: 'exp_1',
  role: 'GERANT' as const,
}

describe('lib/context', () => {
  it('runWithContext makes ctx available inside', async () => {
    const result = await runWithContext(sampleCtx, async () => getContext())
    expect(result).toEqual(sampleCtx)
  })

  it('getContext throws outside a context', () => {
    expect(() => getContext()).toThrow(/outside request scope/)
  })

  it('tryGetContext returns null outside a context', () => {
    expect(tryGetContext()).toBeNull()
  })

  it('nested contexts stack correctly', async () => {
    const outer = sampleCtx
    const inner = { ...sampleCtx, exploitantId: 'exp_2' }
    const result = await runWithContext(outer, async () => {
      const inside = await runWithContext(inner, async () => getContext())
      const outside = getContext()
      return { inside, outside }
    })
    expect(result.inside.exploitantId).toBe('exp_2')
    expect(result.outside.exploitantId).toBe('exp_1')
  })

  it('context is isolated across parallel tasks', async () => {
    const [a, b] = await Promise.all([
      runWithContext({ ...sampleCtx, exploitantId: 'A' }, async () => {
        await new Promise((r) => setTimeout(r, 5))
        return getContext().exploitantId
      }),
      runWithContext({ ...sampleCtx, exploitantId: 'B' }, async () => {
        return getContext().exploitantId
      }),
    ])
    expect(a).toBe('A')
    expect(b).toBe('B')
  })
})

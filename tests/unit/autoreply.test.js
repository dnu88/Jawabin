import { describe, expect, it } from 'vitest'
import { matchRule } from '../../server/autoreply.js'

const rule = (over = {}) => ({
  id: 'r1',
  type: 'keyword',
  keywords: ['harga'],
  reply: 'Cek bio ya',
  prompt: '',
  is_active: true,
  account_id: null,
  ...over,
})

describe('matchRule', () => {
  it('matches a keyword case-insensitively anywhere in the comment', () => {
    expect(matchRule([rule()], { text: 'Berapa HARGAnya kak?' })?.id).toBe('r1')
  })

  it('lets a keyword rule win over an AI rule', () => {
    const rules = [rule({ id: 'ai', type: 'ai', keywords: [], prompt: 'jawab ramah' }), rule({ id: 'kw' })]
    expect(matchRule(rules, { text: 'harga?' })?.id).toBe('kw')
  })

  it('falls back to the AI rule when no keyword matches', () => {
    const rules = [rule({ id: 'kw' }), rule({ id: 'ai', type: 'ai', keywords: [], prompt: 'jawab ramah' })]
    expect(matchRule(rules, { text: 'kapan buka?' })?.id).toBe('ai')
  })

  it('ignores inactive rules', () => {
    expect(matchRule([rule({ is_active: false })], { text: 'harga?' })).toBeUndefined()
  })

  it('scopes account-bound rules to their account and keeps global rules open', () => {
    const scoped = rule({ id: 'scoped', account_id: 'acc-2' })
    const global = rule({ id: 'global', account_id: null })
    expect(matchRule([scoped], { text: 'harga', account_id: 'acc-1' })).toBeUndefined()
    expect(matchRule([scoped], { text: 'harga', account_id: 'acc-2' })?.id).toBe('scoped')
    expect(matchRule([global], { text: 'harga', account_id: 'acc-1' })?.id).toBe('global')
  })

  it('skips blank keywords instead of matching everything', () => {
    expect(matchRule([rule({ keywords: ['', '   '] })], { text: 'apa saja' })).toBeUndefined()
  })

  it('returns undefined when the comment text is empty and only an AI rule exists', () => {
    expect(matchRule([rule({ type: 'ai', keywords: [], prompt: 'x' })], { text: '' })?.id).toBe('r1')
    expect(matchRule([rule()], {})).toBeUndefined()
  })
})

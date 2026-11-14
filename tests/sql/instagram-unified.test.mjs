// Offline PostgreSQL contract tests. No Supabase keys or external APIs used.
// Run: node --test tests/sql/instagram-unified.test.mjs (requires Docker).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const container = `jawabin-unified-test-${process.pid}`
const args = ['exec', '-i', container, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At']
const sql = text => execFileSync('docker', args, { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
const user1 = '00000000-0000-0000-0000-000000000001'
const user2 = '00000000-0000-0000-0000-000000000002'
const row = id => ({ platform_user_id: id, username: `mock-${id}`, access_token_encrypted: 'mock-encrypted', auth_mode: 'unified_login', client_business_id: '999', login_config_id: '456', token_expires_at: null })
const connect = (user, rows) => `select public.connect_instagram_accounts('${user}', '${JSON.stringify(rows)}'::jsonb);`

before(async () => {
  execFileSync('docker', ['run', '--detach', '--name', container, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'pgvector/pgvector:pg15'], { stdio: 'pipe' })
  for (let attempt = 0; ; attempt++) {
    try { sql('select 1;'); break } catch (error) {
      if (attempt >= 60) throw error
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  sql(`create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${user1}'), ('${user2}');
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to service_role;`)
  sql(readFileSync(new URL('../../supabase/migrations/0002_core.sql', import.meta.url), 'utf8'))
  sql(`insert into public.accounts(user_id, platform, platform_user_id, access_token_encrypted) values ('${user1}', 'instagram', '100', 'legacy-token');`)
  sql(readFileSync(new URL('../../supabase/migrations/0005_instagram_unified_login.sql', import.meta.url), 'utf8'))
  sql('grant all on all tables in schema public to service_role;')
})
after(() => { execFileSync('docker', ['rm', '-f', container], { stdio: 'pipe' }) })

test('legacy rows survive migration and null expiry; safe batch reconnect preserves IDs', () => {
  assert.equal(sql("select auth_mode || ':' || access_token_encrypted || ':' || (token_expires_at is null)::text from accounts where platform_user_id='100'"), 'instagram_login:legacy-token:true')
  sql(`set role service_role; ${connect(user1, [row('101'), row('102')])}`)
  const ids = sql("select id from accounts where platform_user_id in ('101','102') order by id")
  sql(`set role service_role; ${connect(user1, [row('101'), row('102')])}`)
  assert.equal(sql("select id from accounts where platform_user_id in ('101','102') order by id"), ids)
  assert.equal(sql('select count(*) from accounts'), '3')
})
test('cross-mode reconnect rejects a complete batch and preserves the old connection exactly', () => {
  const before = sql("select row_to_json(a) from accounts a where platform_user_id='100'")
  assert.throws(() => sql(connect(user1, [row('108'), row('100')])), /login method transition is not supported/)
  assert.equal(sql("select row_to_json(a) from accounts a where platform_user_id='100'"), before)
  assert.equal(sql("select count(*) from accounts where platform_user_id='108'"), '0')
  const unifiedBefore = sql("select row_to_json(a) from accounts a where platform_user_id='101'")
  assert.throws(() => sql(connect(user1, [{ ...row('101'), auth_mode: 'instagram_login' }])), /login method transition is not supported/)
  assert.equal(sql("select row_to_json(a) from accounts a where platform_user_id='101'"), unifiedBefore)
})
test('all owners are checked before writes and ownership cannot transfer', () => {
  assert.throws(() => sql(connect(user2, [row('103'), row('101')])), /belongs to another user/)
  assert.equal(sql("select count(*) from accounts where platform_user_id='103'"), '0')
  assert.equal(sql("select user_id from accounts where platform_user_id='101'"), user1)
})
test('invalid metadata and duplicate IDs roll back the entire batch', () => {
  assert.throws(() => sql(connect(user1, [row('104'), { ...row('105'), client_business_id: null }])), /accounts_unified_metadata/)
  assert.equal(sql("select count(*) from accounts where platform_user_id in ('104','105')"), '0')
  assert.throws(() => sql(connect(user1, [row('104'), row('104')])), /duplicate Instagram account/)
  assert.throws(() => sql(connect(user1, [])), /invalid account batch size/)
  assert.throws(() => sql(connect(user1, [{ ...row('104'), platform_user_id: '../evil' }])), /invalid or duplicate/)
})
test('anon and authenticated cannot execute ownership RPC', () => {
  for (const role of ['anon', 'authenticated']) assert.throws(() => sql(`set role ${role}; ${connect(user1, [row('106')])}`), /permission denied for function/)
})
function asyncSql(text) {
  const proc = spawn('docker', args)
  let stderr = ''
  proc.stderr.on('data', data => { stderr += data })
  proc.stdin.end(text)
  return new Promise(resolve => proc.on('close', code => resolve({ code, stderr })))
}
test('competing callbacks cannot steal a newly inserted account', async () => {
  const outcomes = await Promise.all([
    asyncSql(`begin; ${connect(user1, [row('107')])} select pg_sleep(0.2); commit;`),
    asyncSql(`begin; ${connect(user2, [row('107')])} select pg_sleep(0.2); commit;`),
  ])
  assert.equal(outcomes.filter(result => result.code === 0).length, 1)
  assert.match(outcomes.find(result => result.code !== 0).stderr, /belongs to another user/)
  assert.equal(sql("select count(*) from accounts where platform_user_id='107'"), '1')
})

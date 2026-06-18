import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _db: SupabaseClient | null = null

function getDb(): SupabaseClient {
  if (_db) return _db
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  _db = createClient(url, key)
  return _db
}

const db = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  title: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  pinned: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Feedback {
  id: string
  user_id: string
  session_id: string
  rating: number
  comment: string | null
  created_at: string
}

export async function getUser(email: string): Promise<User | null> {
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  if (error || !data) return null
  return data as User
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const { data, error } = await db
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function createSession(userId: string, title = 'New session'): Promise<Session> {
  const { data, error } = await db
    .from('sessions')
    .insert({ user_id: userId, title })
    .select()
    .single()
  if (error) throw error
  return data as Session
}

export async function getSessions(userId: string): Promise<Session[]> {
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Session[]
}

export async function getSession(id: string): Promise<Session | null> {
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Session
}

export async function updateSession(
  id: string,
  fields: Partial<Pick<Session, 'title' | 'status' | 'pinned'>>
): Promise<Session> {
  const { data, error } = await db
    .from('sessions')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Session
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await db.from('sessions').delete().eq('id', id)
  if (error) throw error
}

export async function createMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message> {
  const { data, error } = await db
    .from('messages')
    .insert({ session_id: sessionId, role, content })
    .select()
    .single()
  if (error) throw error
  return data as Message
}

export async function getMessages(
  sessionId: string,
  limit = 100,
  before?: string
): Promise<Message[]> {
  let query = db
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (before) {
    query = query.lt('created_at', before)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function createFeedback(
  userId: string,
  sessionId: string,
  rating: number,
  comment?: string
): Promise<Feedback> {
  const { data, error } = await db
    .from('feedback')
    .insert({ user_id: userId, session_id: sessionId, rating, comment: comment ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Feedback
}

export async function getKPIs(userId: string) {
  const [
    totalSessions,
    sessionsThisWeek,
    totalMessages,
    messagesThisWeek,
    activeSessions,
    pinnedSessions,
    avgRating,
    failedSessions,
  ] = await Promise.all([
    db.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    db.from('messages').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    db.from('messages').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    db.rpc('count_active_sessions', { p_user_id: userId }).single(),
    db.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('pinned', true),
    db.from('feedback').select('rating').eq('user_id', userId),
    db.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'error'),
  ])

  const ratings = (avgRating.data ?? []) as { rating: number }[]
  const avg = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null

  return {
    totalSessions: totalSessions.count ?? 0,
    sessionsThisWeek: sessionsThisWeek.count ?? 0,
    totalMessages: totalMessages.count ?? 0,
    messagesThisWeek: messagesThisWeek.count ?? 0,
    activeSessions: typeof activeSessions.data === 'number' ? activeSessions.data : null,
    pinnedSessions: pinnedSessions.count ?? 0,
    avgRating: avg ? Math.round(avg * 10) / 10 : null,
    failedSessions: failedSessions.count ?? 0,
  }
}

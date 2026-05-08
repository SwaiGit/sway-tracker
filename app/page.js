import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrackerApp from '@/components/TrackerApp'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <TrackerApp user={user} />
}

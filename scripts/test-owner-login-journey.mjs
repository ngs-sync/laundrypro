import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Helper to parse .env file manually without external dotenv package
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim()
        const value = trimmed.substring(idx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in environment!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function logErrorDetails(stepName, error) {
  console.error(`\n❌ [ERROR AT ${stepName}]`)
  if (!error) {
    console.error('No error object received.')
    return
  }
  console.error('Message :', error.message || 'N/A')
  console.error('Code    :', error.code || 'N/A')
  console.error('Hint    :', error.hint || 'N/A')
  console.error('Details :', error.details || 'N/A')
  if (error.status) console.error('Status  :', error.status)
}

async function runOwnerLoginJourney() {
  const testUsername = process.env.TEST_OWNER_USERNAME || 'ar_01'
  const testPassword = process.env.TEST_OWNER_PASSWORD || 'password123'

  console.log('==================================================')
  console.log('🚀 STARTING STANDALONE OWNER LOGIN USER JOURNEY TEST')
  console.log('==================================================')

  // --- STEP 1: Call RPC get_login_email_by_username ---
  console.log('\n--- LANGKAH 1: Call RPC get_login_email_by_username ---')
  const rpcPayload = { p_username: testUsername }
  console.log('Payload dikirim:', JSON.stringify(rpcPayload))

  let email = null
  try {
    const { data, error, status, statusText } = await supabase.rpc(
      'get_login_email_by_username',
      rpcPayload
    )

    console.log(`RPC Response Status: ${status} ${statusText}`)
    console.log('RPC Return Value   :', data)

    if (error) {
      logErrorDetails('LANGKAH 1 (RPC get_login_email_by_username)', error)
      return
    }

    if (!data) {
      console.warn('⚠️ Username tidak ditemukan atau role bukan owner/superadmin.')
      return
    }

    email = data
  } catch (err) {
    logErrorDetails('LANGKAH 1 (Exception)', err)
    return
  }

  // --- STEP 2: Auth signInWithPassword ---
  console.log('\n--- LANGKAH 2: Auth signInWithPassword ---')
  console.log('Attempting sign in with email:', email)

  let authSession = null
  let authUser = null

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: testPassword
    })

    if (authError) {
      logErrorDetails('LANGKAH 2 (signInWithPassword)', authError)
      return
    }

    console.log('Auth Success!')
    console.log('User ID    :', authData.user?.id)
    console.log('Email      :', authData.user?.email)
    console.log('Session    :', authData.session ? 'Valid (Token acquired)' : 'No Session')

    authSession = authData.session
    authUser = authData.user
  } catch (err) {
    logErrorDetails('LANGKAH 2 (Exception)', err)
    return
  }

  // --- STEP 3: Fetch Profile from public.users using auth token ---
  console.log('\n--- LANGKAH 3: Fetch user profile from public.users ---')
  try {
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authSession.access_token}`
        }
      }
    })

    const { data: userProfile, error: profileError } = await authenticatedClient
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (profileError) {
      logErrorDetails('LANGKAH 3 (Fetch public.users)', profileError)
      return
    }

    console.log('User Profile Data:', userProfile)

    if (!userProfile) {
      console.warn('⚠️ Sesi terautentikasi tetapi record profil di public.users tidak ditemukan!')
    } else {
      console.log('✅ Detail Profil berhasil didapatkan:')
      console.log('   ID       :', userProfile.id)
      console.log('   Full Name:', userProfile.full_name)
      console.log('   Role     :', userProfile.role)
      console.log('   Tenant ID:', userProfile.tenant_id)
    }
  } catch (err) {
    logErrorDetails('LANGKAH 3 (Exception)', err)
    return
  }

  // --- STEP 4: Simulate Auth Store update and Route transition ---
  console.log('\n--- LANGKAH 4: Simulasikan pembaruan authStore & Navigasi ke /owner ---')
  try {
    const simulatedStoreState = {
      user: {
        id: authUser.id,
        email: authUser.email
      },
      isAuthenticated: true,
      currentRoute: '/owner'
    }

    console.log('Simulated Auth Store State Updated:', JSON.stringify(simulatedStoreState, null, 2))
    console.log('✅ Route transition simulated: Navigating to /owner')
    console.log('==================================================')
    console.log('🎉 JOURNEY TEST COMPLETED SUCCESSFULLY')
    console.log('==================================================')
  } catch (err) {
    logErrorDetails('LANGKAH 4 (Simulation Exception)', err)
  }
}

runOwnerLoginJourney()

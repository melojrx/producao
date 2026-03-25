import { createClient } from '@supabase/supabase-js'

const email = process.argv[2] ?? 'codex.admin@example.com'
const password = process.argv[3] ?? 'CodexAdmin#2026'
const role = process.argv[4] ?? 'admin'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar o script.')
}

if (!['admin', 'supervisor'].includes(role)) {
  throw new Error('Role inválida. Use admin ou supervisor.')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200,
})

if (listError) {
  throw listError
}

const existingUser = usersPage.users.find((user) => user.email === email)

if (!existingUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role,
    },
  })

  if (error) {
    throw error
  }

  console.log(
    JSON.stringify(
      {
        action: 'created',
        userId: data.user.id,
        email,
        role,
      },
      null,
      2
    )
  )
} else {
  const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    app_metadata: {
      ...(existingUser.app_metadata ?? {}),
      role,
    },
  })

  if (error) {
    throw error
  }

  console.log(
    JSON.stringify(
      {
        action: 'updated',
        userId: data.user.id,
        email,
        role,
      },
      null,
      2
    )
  )
}

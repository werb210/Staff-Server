type Session = {
  phone: string
  code: string
}

const store = new Map<string, Session>()

export function createOtp(phone: string) {
  const code = '123456'
  store.set(phone, { phone, code })
  return code
}

export function verifyOtp(phone: string, code: string) {
  const session = store.get(phone)
  if (!session) return false
  return session.code === code
}

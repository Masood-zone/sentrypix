const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?"

export function generateStrongPassword(length = 24): string {
  if (!Number.isInteger(length) || length < 16 || length > 128) throw new RangeError("Invalid password length.")
  const max = Math.floor(256 / PASSWORD_ALPHABET.length) * PASSWORD_ALPHABET.length
  let result = ""
  while (result.length < length) {
    const random = crypto.getRandomValues(new Uint8Array(length))
    for (const value of random) {
      if (value < max) result += PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]
      if (result.length === length) break
    }
  }
  return result
}

export function passwordStrength(password: string): "weak" | "fair" | "strong" {
  if (password.length < 12) return "weak"
  const groups = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) => pattern.test(password)).length
  return password.length >= 20 && groups >= 3 ? "strong" : "fair"
}

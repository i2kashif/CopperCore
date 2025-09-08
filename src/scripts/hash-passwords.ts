/**
 * Hash Passwords Script
 * Updates existing users with hashed passwords for authentication
 */

import { hashPassword } from '../server/lib/auth.js'
import { query } from '../server/lib/database.js'

const userPasswords = [
  { username: 'ceo', password: 'admin123' },
  { username: 'director', password: 'dir123456' },
  { username: 'fm1', password: 'fm123456' },
  { username: 'fm2', password: 'fm123456' },
  { username: 'fw1', password: 'fw123456' },
  { username: 'office1', password: 'office123' },
  { username: 'fm_multi', password: 'fm123456' }
]

async function hashUserPasswords() {
  console.log('Hashing passwords for test users...')
  
  try {
    for (const { username, password } of userPasswords) {
      console.log(`Processing user: ${username}`)
      
      // Hash the password
      const passwordHash = await hashPassword(password)
      
      // Update the user
      const result = await query(
        'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
        [passwordHash, username]
      )
      
      if (result.rows.length > 0) {
        console.log(`✅ Updated password for user: ${username}`)
      } else {
        console.log(`⚠️  User not found: ${username}`)
      }
    }
    
    console.log('Password hashing complete!')
  } catch (error) {
    console.error('Error hashing passwords:', error)
    process.exit(1)
  }
}

// Run the script
hashUserPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
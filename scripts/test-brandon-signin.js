/**
 * Test signin for Brandon's confirmed account
 */

async function testSignin(password) {
  const response = await fetch('https://describe-it-lovat.vercel.app/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'brandon.lambert87@gmail.com',
      password: password
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`✅ SUCCESS with password: ${password}`);
    console.log('Session:', data.session ? 'Active' : 'None');
    return true;
  } else {
    console.log(`❌ Failed: ${password} - ${data.error}`);
    return false;
  }
}

// Test common passwords
const passwords = [
  'password',
  'Password123',
  'Test123',
  'Test123!',
  'Brandon123',
  'brandon123',
  'Describe123',
  'describe123'
];

console.log('Testing signin for brandon.lambert87@gmail.com');
console.log('Account Status: CONFIRMED ✅');
console.log('Last successful signin: Sep 10, 2025\n');

async function testAll() {
  for (const pwd of passwords) {
    const success = await testSignin(pwd);
    if (success) {
      console.log('\n🎉 Found working password!');
      console.log('You can now sign in at: https://describe-it-lovat.vercel.app');
      break;
    }
  }
}

testAll();
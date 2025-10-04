// Flow Nexus Secure Login Script
// This script handles authentication without exposing credentials in chat

require('dotenv').config({ path: '.env.flow-nexus' });

async function loginToFlowNexus() {
  const email = process.env.FLOW_NEXUS_EMAIL;
  const password = process.env.FLOW_NEXUS_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ Missing credentials. Please set FLOW_NEXUS_EMAIL and FLOW_NEXUS_PASSWORD in .env.flow-nexus file');
    process.exit(1);
  }
  
  console.log('🔐 Attempting to login to Flow Nexus...');
  console.log(`📧 Email: ${email}`);
  console.log('🔑 Password: [HIDDEN]');
  
  // The actual login will happen through MCP after Claude Code restart
  console.log(`
✅ Credentials configured! 

Next steps:
1. Change your password immediately (it was exposed in chat)
2. Update the password in .env.flow-nexus
3. Restart Claude Code
4. Use in Claude Code: mcp__flow-nexus__user_login({ 
     email: process.env.FLOW_NEXUS_EMAIL, 
     password: process.env.FLOW_NEXUS_PASSWORD 
   })
`);
}

loginToFlowNexus();
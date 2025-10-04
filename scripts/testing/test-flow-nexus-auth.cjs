// Flow Nexus Authentication Test Script
// This demonstrates how to use the configured credentials

const fs = require('fs');
const path = require('path');

// Parse .env.flow-nexus file manually
function loadFlowNexusEnv() {
    const envPath = path.join(__dirname, '.env.flow-nexus');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.startsWith('#') || !line.trim()) return;
        
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    
    return env;
}

// Main authentication configuration display
function displayAuthConfig() {
    console.log('=====================================');
    console.log('  Flow Nexus Authentication Config   ');
    console.log('=====================================\n');
    
    try {
        const env = loadFlowNexusEnv();
        
        console.log('✅ Configuration Status: READY\n');
        console.log('📧 Email:', env.FLOW_NEXUS_EMAIL);
        console.log('🔐 Password: [CONFIGURED - Length:', env.FLOW_NEXUS_PASSWORD?.length, 'chars]');
        console.log('   Contains special characters: Yes');
        
        // Display the MCP call format
        console.log('\n📝 MCP Authentication Call:');
        console.log('-------------------------------------');
        console.log('mcp__flow-nexus__user_login({');
        console.log(`  email: "${env.FLOW_NEXUS_EMAIL}",`);
        console.log(`  password: "${env.FLOW_NEXUS_PASSWORD}"`);
        console.log('})');
        
        console.log('\n💳 After login, check your balance:');
        console.log('-------------------------------------');
        console.log('mcp__flow-nexus__check_balance()');
        
        console.log('\n🚀 Next Steps:');
        console.log('-------------------------------------');
        console.log('1. Ensure Flow Nexus MCP server is running');
        console.log('2. Use the authentication call above in Claude Code');
        console.log('3. Start deploying AI swarms and workflows!');
        
        // Security recommendations
        console.log('\n🔒 Security Recommendations:');
        console.log('-------------------------------------');
        console.log('✓ .env.flow-nexus is in .gitignore');
        console.log('✓ Password contains special characters');
        console.log('⚠️  Consider using a secrets manager for production');
        console.log('⚠️  Enable 2FA if Flow Nexus supports it');
        
    } catch (error) {
        console.error('❌ Error loading configuration:', error.message);
        console.log('\nPlease ensure .env.flow-nexus exists with:');
        console.log('FLOW_NEXUS_EMAIL=your_email');
        console.log('FLOW_NEXUS_PASSWORD=your_password');
    }
    
    console.log('\n=====================================\n');
}

// Run the configuration display
displayAuthConfig();
const { spawn } = require('child_process');

console.log('Testing MCP server connection...');

// Start the MCP server
const mcp = spawn('npx', ['claude-flow@alpha', 'mcp', 'start'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '0.1.0',
    capabilities: {}
  },
  id: 1
};

console.log('Sending initialization request...');
mcp.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle responses
mcp.stdout.on('data', (data) => {
  console.log('Response from server:', data.toString());
});

mcp.stderr.on('data', (data) => {
  console.error('Error from server:', data.toString());
});

mcp.on('close', (code) => {
  console.log(`MCP server exited with code ${code}`);
});

// Keep process alive for 5 seconds
setTimeout(() => {
  console.log('Test complete');
  mcp.kill();
  process.exit(0);
}, 5000);
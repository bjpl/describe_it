const { spawn } = require('child_process');

console.log('Testing MCP server connection on Windows...');

// Use cmd.exe to run npx
const mcp = spawn('cmd.exe', ['/c', 'npx', 'claude-flow@alpha', 'mcp', 'start'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false
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
  const response = data.toString();
  console.log('Response from server:', response);
  
  // Try to parse as JSON
  try {
    const lines = response.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.startsWith('{')) {
        const json = JSON.parse(line);
        console.log('Parsed response:', JSON.stringify(json, null, 2));
      }
    });
  } catch (e) {
    // Not JSON, just text
  }
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
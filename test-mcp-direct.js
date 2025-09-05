const { spawn } = require('child_process');
const readline = require('readline');

console.log('Testing MCP server direct connection...\n');

// Start the MCP server exactly as Claude Desktop would
const mcp = spawn('cmd', ['/c', 'npx', 'claude-flow@alpha', 'mcp', 'start'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false,
  windowsHide: true
});

let buffer = '';

mcp.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  lines.forEach(line => {
    if (line.trim()) {
      console.log('STDOUT:', line);
      if (line.includes('{') && line.includes('}')) {
        try {
          const json = JSON.parse(line);
          console.log('Valid JSON response received');
        } catch (e) {
          // Not JSON
        }
      }
    }
  });
});

mcp.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

mcp.on('error', (error) => {
  console.error('Process error:', error);
});

mcp.on('close', (code) => {
  console.log(`\nMCP server exited with code ${code}`);
});

// Send proper MCP initialization after a short delay
setTimeout(() => {
  const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  console.log('\nSending initialization request...');
  mcp.stdin.write(JSON.stringify(initMessage) + '\n');
}, 1000);

// Keep alive for 10 seconds
setTimeout(() => {
  console.log('\nTest complete');
  process.exit(0);
}, 10000);
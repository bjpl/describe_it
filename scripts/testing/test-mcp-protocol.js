const { spawn } = require('child_process');

console.log('Testing MCP protocol directly...\n');

const proc = spawn('cmd', ['/c', 'claude-flow', 'mcp', 'start'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Wait for startup message, then send init
setTimeout(() => {
  const init = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'claude-ai',
        version: '0.1.0'
      }
    }
  };
  
  console.log('Sending:', JSON.stringify(init));
  proc.stdin.write(JSON.stringify(init) + '\n');
}, 500);

proc.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

proc.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

proc.on('exit', (code) => {
  console.log('\nProcess exited with code:', code);
});

setTimeout(() => {
  console.log('\nTest complete');
  process.exit(0);
}, 5000);
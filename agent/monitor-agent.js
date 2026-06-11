const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Load settings
const configPath = path.join(__dirname, 'config.json');
let config = { apiKey: '', serverUrl: 'http://localhost:3000' };

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error('Error reading config.json:', e);
  }
}

// Command line arguments overrides
const args = process.argv.slice(2);
args.forEach(val => {
  if (val.startsWith('--key=')) config.apiKey = val.split('=')[1];
  if (val.startsWith('--url=')) config.serverUrl = val.split('=')[1];
});

if (!config.apiKey) {
  console.error('Error: API key is required. Specify in config.json or run with --key=YOUR_KEY');
  process.exit(1);
}

// Function to collect CPU metrics asynchronously
function getCpuUsage() {
  return new Promise((resolve) => {
    const startMeasure = os.cpus().map(cpu => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return { idle: cpu.times.idle, total };
    });

    setTimeout(() => {
      const endMeasure = os.cpus().map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return { idle: cpu.times.idle, total };
      });

      let totalDiff = 0;
      let idleDiff = 0;

      for (let i = 0; i < startMeasure.length; i++) {
        totalDiff += endMeasure[i].total - startMeasure[i].total;
        idleDiff += endMeasure[i].idle - startMeasure[i].idle;
      }

      const usage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
      resolve(usage);
    }, 1000);
  });
}

// Function to check disk usage using shell commands
function getDiskUsage() {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const exec = require('child_process').exec;

    if (isWin) {
      exec('wmic logicaldisk get size,freespace,deviceid', (err, stdout) => {
        if (err) return resolve(0);
        const lines = stdout.trim().split('\n').slice(1);
        let total = 0, free = 0;
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            free += parseInt(parts[1]) || 0;
            total += parseInt(parts[2]) || 0;
          }
        });
        resolve(total > 0 ? ((total - free) / total) * 100 : 0);
      });
    } else {
      exec("df / | tail -1 | awk '{print $5}'", (err, stdout) => {
        if (err) return resolve(0);
        const pct = parseInt(stdout.replace('%', '').trim()) || 0;
        resolve(pct);
      });
    }
  });
}

// Collect all server metrics
async function collectMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ramPercent = totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0;

  const cpuPercent = await getCpuUsage();
  const diskPercent = await getDiskUsage();

  return {
    apiKey: config.apiKey,
    cpuPercent,
    ramPercent,
    diskPercent,
    networkInMb: 0,
    networkOutMb: 0,
    uptimeSeconds: Math.round(os.uptime()),
    osInfo: `${os.type()} ${os.release()} (${os.arch()})`,
    hostname: os.hostname(),
    ipAddress: getIpAddress(),
    services: getRunningServicesSummary(),
  };
}

function getIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function getRunningServicesSummary() {
  return [
    { name: 'Node.js', status: 'running' },
    { name: 'OS Platform', status: os.platform() }
  ];
}

// Post reporting payload to Server
async function reportMetrics() {
  try {
    const payload = await collectMetrics();
    const payloadString = JSON.stringify(payload);
    
    const targetUrl = new URL(config.serverUrl + '/api/agent/report');
    const client = targetUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
      },
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${new Date().toLocaleTimeString()}] Metrics sent successfully.`);
        } else {
          console.warn(`[${new Date().toLocaleTimeString()}] API responded with status ${res.statusCode}: ${data}`);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Failed to report metrics to server:', err.message);
    });

    req.write(payloadString);
    req.end();
  } catch (err) {
    console.error('Error during report cycle:', err);
  }
}

// Start interval loop
console.log('Mooonitooor monitoring agent successfully started.');
console.log('Reporting target:', config.serverUrl);
reportMetrics();
setInterval(reportMetrics, 60000);

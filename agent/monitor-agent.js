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
function getProcessCount() {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const exec = require('child_process').exec;
    
    if (isWin) {
      exec('tasklist | find /c /v ""', (err, stdout) => {
        resolve(parseInt(stdout.trim()) || 0);
      });
    } else {
      exec('ps -A --no-headers | wc -l', (err, stdout) => {
        resolve(parseInt(stdout.trim()) || 0);
      });
    }
  });
}

function detectServices() {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const exec = require('child_process').exec;
    
    const servicesToCheck = [
      { name: 'php', cmd: isWin ? 'php-cgi.exe' : 'php-fpm' },
      { name: 'mysql', cmd: isWin ? 'mysqld.exe' : 'mysqld' },
      { name: 'postgres', cmd: isWin ? 'postgres.exe' : 'postgres' },
      { name: 'node', cmd: isWin ? 'node.exe' : 'node' },
      { name: 'nginx', cmd: isWin ? 'nginx.exe' : 'nginx' },
      { name: 'apache', cmd: isWin ? 'httpd.exe' : 'apache2' },
      { name: 'cron', cmd: isWin ? 'svchost.exe' : 'cron' },
      { name: 'supervisor', cmd: isWin ? 'supervisord.exe' : 'supervisord' },
      { name: 'redis', cmd: isWin ? 'redis-server.exe' : 'redis-server' },
      { name: 'docker', cmd: isWin ? 'dockerd.exe' : 'dockerd' },
    ];

    const cmd = isWin ? 'tasklist' : 'ps -A';
    exec(cmd, (err, stdout) => {
      const running = {};
      const out = stdout ? stdout.toLowerCase() : '';
      servicesToCheck.forEach(s => {
        if (s.name === 'apache' && !isWin) {
          running[s.name] = out.includes('apache2') || out.includes('httpd');
        } else {
          running[s.name] = out.includes(s.cmd.toLowerCase());
        }
      });
      resolve(running);
    });
  });
}

function tailLogs() {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const exec = require('child_process').exec;
    const logs = { nginx: '', sys: '' };

    if (isWin) {
      resolve(logs);
    } else {
      let doneCount = 0;
      const checkDone = () => { if (++doneCount === 2) resolve(logs); };

      exec('tail -n 15 /var/log/nginx/error.log 2>/dev/null', (err, stdout) => {
        if (!err && stdout) logs.nginx = stdout.trim();
        else logs.nginx = '[No Nginx error log found or permission denied]';
        checkDone();
      });

      exec('tail -n 15 /var/log/syslog 2>/dev/null', (err, stdout) => {
        if (!err && stdout) logs.sys = stdout.trim();
        else logs.sys = '[No syslog found or permission denied]';
        checkDone();
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
  const processCount = await getProcessCount();
  const daemons = await detectServices();
  const serverLogs = await tailLogs();

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
    services: {
      loadAvg: os.loadavg().map(n => Number(n.toFixed(2))),
      processes: processCount,
      agentRunning: true,
      daemons,
      logs: serverLogs
    },
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

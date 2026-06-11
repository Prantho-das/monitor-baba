import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileType = url.searchParams.get('file');

  // Retrieve origin dynamically so agent reports back to correct URL
  const origin = url.origin;

  // 1. Serve the Agent Node.js Monitoring Script
  if (fileType === 'agent') {
    const agentCode = `
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
        const lines = stdout.trim().split('\\n').slice(1);
        let total = 0, free = 0;
        lines.forEach(line => {
          const parts = line.trim().split(/\\s+/);
          if (parts.length >= 3) {
            free += parseInt(parts[1]) || 0;
            total += parseInt(parts[2]) || 0;
          }
        });
        resolve(total > 0 ? ((total - free) / total) * 100 : 0);
      });
    } else {
      exec("df / | tail -1 | awk '{print \$5}'", (err, stdout) => {
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
    osInfo: \`\${os.type()} \${os.release()} (\${os.arch()})\`,
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
          console.log(\`[\${new Date().toLocaleTimeString()}] Metrics sent successfully.\`);
        } else {
          console.warn(\`[\${new Date().toLocaleTimeString()}] API responded with status \${res.statusCode}: \${data}\`);
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
`;

    return new Response(agentCode, {
      headers: {
        'Content-Type': 'application/javascript',
      },
    });
  }

  // 2. Serve the Linux one-liner bash installer script
  const installBash = `#!/bin/bash
# Mooonitooor Server Agent Installer
# Autogenerated script for target: ${origin}

API_KEY=$1

if [ -z "$API_KEY" ]; then
    echo -e "\\e[31mError: API_KEY argument is missing!\\e[0m"
    echo "Usage: curl -fsSL ${origin}/api/agent/install | bash -s -- YOUR_API_KEY"
    exit 1
fi

echo -e "\\e[34m[+] Starting Mooonitooor Agent Installation...\\e[0m"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\\e[33m[-] Node.js is not installed. Installing Node.js...\\e[0m"
    if [ -f /etc/debian_version ]; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif [ -f /etc/redhat-release ]; then
        sudo dnf install -y nodejs
    else
        echo -e "\\e[31m[-] Node.js install automatically not supported on this OS. Please install manually.\\e[0m"
        exit 1
    fi
fi

# Create agent workspace
INSTALL_DIR="/opt/mooonitooor-agent"
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR
cd $INSTALL_DIR

# Download monitoring script
echo -e "\\e[34m[+] Downloading monitoring script...\\e[0m"
curl -fsSL "${origin}/api/agent/install?file=agent" -o monitor-agent.js

# Save config file
echo -e "\\e[34m[+] Writing configuration keys...\\e[0m"
cat <<EOF > config.json
{
  "apiKey": "$API_KEY",
  "serverUrl": "${origin}"
}
EOF

# Setup systemd background service (Linux daemon)
echo -e "\\e[34m[+] Creating background system service daemon...\\e[0m"
sudo cat <<EOF > /etc/systemd/system/mooonitooor-agent.service
[Unit]
Description=Mooonitooor Monitoring Agent Daemon
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(command -v node) $INSTALL_DIR/monitor-agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload daemon and start
echo -e "\\e[34m[+] Starting service...\\e[0m"
sudo systemctl daemon-reload
sudo systemctl enable mooonitooor-agent
sudo systemctl restart mooonitooor-agent

echo -e "\\e[32m[✓] Mooonitooor Agent successfully installed and running in the background!\\e[0m"
echo -e "You can check logs with: \\e[36mjournalctl -u mooonitooor-agent -f\\e[0m"
`;

  return new Response(installBash, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

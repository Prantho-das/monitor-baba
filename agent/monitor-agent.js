const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');
const path = require('path');

const AGENT_VERSION = "1.1.0";

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

// Function to get network bandwidth (TX/RX)
function getNetworkUsage() {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const exec = require('child_process').exec;

    if (isWin) {
      // Basic fallback for Windows (WMI is too slow for 1s diffing)
      resolve({ rxMb: 0, txMb: 0 });
    } else {
      exec("cat /proc/net/dev | grep -v 'lo:' | awk '{print $1,$2,$10}'", (err, stdout) => {
        if (err || !stdout) return resolve({ rxMb: 0, txMb: 0 });
        
        let initialRx = 0;
        let initialTx = 0;
        stdout.trim().split('\n').slice(2).forEach(line => {
          const parts = line.trim().split(/[\s:]+/);
          if (parts.length >= 3) {
            initialRx += parseInt(parts[1]) || 0;
            initialTx += parseInt(parts[2]) || 0;
          }
        });

        setTimeout(() => {
          exec("cat /proc/net/dev | grep -v 'lo:' | awk '{print $1,$2,$10}'", (err, stdout2) => {
            if (err || !stdout2) return resolve({ rxMb: 0, txMb: 0 });
            
            let finalRx = 0;
            let finalTx = 0;
            stdout2.trim().split('\n').slice(2).forEach(line => {
              const parts = line.trim().split(/[\s:]+/);
              if (parts.length >= 3) {
                finalRx += parseInt(parts[1]) || 0;
                finalTx += parseInt(parts[2]) || 0;
              }
            });

            // Calculate MB per second
            const rxDiff = Math.max(0, finalRx - initialRx);
            const txDiff = Math.max(0, finalTx - initialTx);
            resolve({
              rxMb: Number((rxDiff / 1024 / 1024).toFixed(2)),
              txMb: Number((txDiff / 1024 / 1024).toFixed(2))
            });
          });
        }, 1000);
      });
    }
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
      { name: 'php', cmd: isWin ? 'php-cgi.exe' : 'php' },
      { name: 'mysql', cmd: isWin ? 'mysqld.exe' : 'mysqld' },
      { name: 'postgres', cmd: isWin ? 'postgres.exe' : 'postgres' },
      { name: 'node', cmd: isWin ? 'node.exe' : 'node' },
      { name: 'nginx', cmd: isWin ? 'nginx.exe' : 'nginx' },
      { name: 'apache', cmd: isWin ? 'httpd.exe' : 'apache' },
      { name: 'cron', cmd: isWin ? 'svchost.exe' : 'cron' },
      { name: 'supervisor', cmd: isWin ? 'supervisord.exe' : 'supervisord' },
      { name: 'redis', cmd: isWin ? 'redis-server.exe' : 'redis-server' },
      { name: 'docker', cmd: isWin ? 'dockerd.exe' : 'dockerd' },
    ];

    if (isWin) {
      exec('tasklist', (err, stdout) => {
        const running = {};
        const out = stdout ? stdout.toLowerCase() : '';
        servicesToCheck.forEach(s => {
          running[s.name] = {
            running: out.includes(s.cmd.toLowerCase()),
            cpu: 0,
            mem: 0
          };
        });
        resolve(running);
      });
    } else {
      exec('ps -eo comm,%cpu,%mem --no-headers', (err, stdout) => {
        const running = {};
        servicesToCheck.forEach(s => running[s.name] = { running: false, cpu: 0, mem: 0 });
        
        if (stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const comm = parts[0].toLowerCase();
              const cpu = parseFloat(parts[1]) || 0;
              const mem = parseFloat(parts[2]) || 0;
              
              servicesToCheck.forEach(s => {
                const match = s.name === 'apache' ? (comm.includes('apache2') || comm.includes('httpd')) : comm.includes(s.cmd);
                if (match) {
                  running[s.name].running = true;
                  running[s.name].cpu += cpu;
                  running[s.name].mem += mem;
                }
              });
            }
          });
        }
        
        Object.keys(running).forEach(k => {
          running[k].cpu = Number(running[k].cpu.toFixed(1));
          running[k].mem = Number(running[k].mem.toFixed(1));
        });
        
        resolve(running);
      });
    }
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
  const network = await getNetworkUsage();
  const processCount = await getProcessCount();
  const daemons = await detectServices();
  const serverLogs = await tailLogs();

  return {
    apiKey: config.apiKey,
    agentVersion: AGENT_VERSION,
    cpuPercent,
    ramPercent,
    diskPercent,
    networkInMb: network.rxMb,
    networkOutMb: network.txMb,
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
          try {
            const resData = JSON.parse(data);
            if (resData.latestVersion && resData.latestVersion !== AGENT_VERSION) {
              autoUpdate(resData.latestVersion);
            }
          } catch (e) {}
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

// Function to handle self-update
function autoUpdate(latestVersion) {
  const isWin = os.platform() === 'win32';
  if (isWin) {
    console.warn(`[Update] Version ${latestVersion} available. Please update Windows agent manually.`);
    return;
  }
  
  console.log(`\n[UPDATE] New version v${latestVersion} detected! Initiating auto-update...`);
  const exec = require('child_process').exec;
  
  // Use the one-liner installer. It overwrites monitor-agent.js and restarts the daemon!
  const cmd = `curl -fsSL ${config.serverUrl}/api/agent/install | bash -s -- ${config.apiKey}`;
  
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('[UPDATE ERROR] Failed to auto-update:', err.message);
      return;
    }
    console.log('[UPDATE SUCCESS] Agent updated. Restarting...');
    process.exit(0); // Systemd will automatically restart the process
  });
}

// Start interval loop
console.log(`Monitor-Baba monitoring agent v${AGENT_VERSION} successfully started.`);
console.log('Reporting target:', config.serverUrl);
reportMetrics();
setInterval(reportMetrics, 60000);

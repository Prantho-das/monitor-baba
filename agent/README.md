# Mooonitooor Server Agent

This is the lightweight, zero-dependency monitoring agent script that runs on your server to collect utilization statistics and reports them back to your Next.js dashboard.

## Manual Execution

1. Copy `monitor-agent.js` and `config.json.example` to your server.
2. Rename `config.json.example` to `config.json`.
3. Edit `config.json` to insert your Server API Key and Dashboard URL.
4. Run the agent in the background:
   ```bash
   node monitor-agent.js
   ```

## Production background systemd service daemon setup (Linux)

You can set this up to automatically run as a background service:

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/mooonitooor-agent.service
   ```
2. Insert configuration settings:
   ```ini
   [Unit]
   Description=Mooonitooor Monitoring Agent Daemon
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/agent/directory
   ExecStart=/usr/bin/node /path/to/agent/directory/monitor-agent.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```
3. Reload systemd daemons and launch background process:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mooonitooor-agent
   sudo systemctl start mooonitooor-agent
   ```
4. Confirm statuses:
   ```bash
   sudo systemctl status mooonitooor-agent
   ```

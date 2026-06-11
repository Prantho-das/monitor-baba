const fs = require('fs');
const agentCode = fs.readFileSync('agent/monitor-agent.js', 'utf8');
const routePath = 'src/app/api/agent/install/route.ts';
let routeCode = fs.readFileSync(routePath, 'utf8');

const startMarker = 'const agentCode = `\n';
const endMarker = '`;\n\n    return new Response(agentCode';

const startIdx = routeCode.indexOf(startMarker);
const endIdx = routeCode.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  // Escape backticks and dollar signs inside the agent code so it can be safely injected into the template string
  const safeAgentCode = agentCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const newRouteCode = routeCode.substring(0, startIdx + startMarker.length) + 
                       safeAgentCode + 
                       routeCode.substring(endIdx);
  fs.writeFileSync(routePath, newRouteCode);
  console.log('Successfully updated route.ts');
} else {
  console.log('Could not find markers');
}

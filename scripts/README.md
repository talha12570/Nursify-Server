# Automatic IP Detection System

This system automatically detects your local network IP address and updates all configuration files across the Nursify application.

## How It Works

When you start the server, the system:
1. **Detects** your current local IPv4 address
2. **Updates** the `.env` file with `SERVER_IP=<detected_ip>`
3. **Updates** `App/config/api.js` with the detected IP
4. **Updates** `Admin Portal/src/config/api.ts` with the detected IP
5. **Starts** the server using the detected IP

## Usage

### Automatic (Recommended)
Just run your normal start commands - IP detection happens automatically:

```bash
# Start just the server
npm start

# Or start all services
START_ALL.bat
```

### Manual IP Update
If you need to manually update the IP (e.g., after switching networks):

```bash
cd Server
npm run update-ip
```

Or use PowerShell:

```powershell
cd Server
.\scripts\update-ip.ps1
```

## Files Updated Automatically

1. **Server/.env** - Adds/updates `SERVER_IP` variable
2. **App/config/api.js** - Updates `SERVER_IP` constant
3. **Admin Portal/src/config/api.ts** - Updates `SERVER_IP` constant

## Network Switching

When you switch networks (e.g., from home WiFi to office WiFi):
1. Simply restart the server with `npm start`
2. The IP will be auto-detected and all configs updated
3. No manual changes needed!

## How It Handles Multiple Network Adapters

The script prioritizes:
1. Active network adapters (not loopback)
2. Valid IPv4 addresses (excludes link-local addresses like 169.254.x.x)
3. First matching adapter found

## Fallback Behavior

If no network IP is detected, the system falls back to `localhost`.

## Scripts Location

- **Node.js Script**: `Server/scripts/update-ip.js`
- **PowerShell Script**: `Server/scripts/update-ip.ps1`

Both scripts do the same thing - use whichever works best for your environment.

## Troubleshooting

### IP not detecting correctly?

Run the manual update command to see diagnostic output:
```bash
npm run update-ip
```

### Need to use a specific IP?

You can manually set it in `.env`:
```
SERVER_IP=192.168.1.100
```

The server will use the value from `.env` if it exists.

### Changes not reflecting in the app?

After IP change:
1. **Server**: Restart with `npm start`
2. **Admin Portal**: Refresh the browser
3. **Mobile App**: Reload the app (shake device → Reload)

## Benefits

✅ **Zero manual configuration** - Works automatically  
✅ **Network switching support** - Change networks without hassle  
✅ **Consistent across all apps** - Server, Admin Portal, and Mobile App stay in sync  
✅ **Developer friendly** - One command starts everything correctly  
✅ **Cross-platform** - Works on Windows with both Node.js and PowerShell scripts

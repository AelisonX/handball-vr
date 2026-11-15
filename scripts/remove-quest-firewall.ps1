$ErrorActionPreference = 'Stop'
Remove-NetFirewallRule -Name 'HandballVR-LAN-8444' -ErrorAction SilentlyContinue
Write-Host 'Removed the Handball Quest test firewall rule.'

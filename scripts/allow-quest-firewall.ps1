# Run manually as Administrator only if the headset cannot reach the local game.
# This rule is separate from Bean There VR and permits only local-subnet traffic.
$ErrorActionPreference = 'Stop'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$addressPath = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'work\handball-tls\address.txt'
if (-not (Test-Path -LiteralPath $addressPath)) { throw 'Run START-QUEST.cmd first to detect this PC address.' }
$lanIp = (Get-Content -LiteralPath $addressPath -Raw).Trim()
if ($lanIp -notmatch '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)') { throw 'Expected a private local-network address.' }
$ruleName = 'HandballVR-LAN-8444'
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'Handball VR - local Quest test only' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8444 -LocalAddress $lanIp -RemoteAddress LocalSubnet -Profile Any -Program $nodePath | Out-Null
}
Write-Host "Handball TCP 8444 at $lanIp is allowed for devices on the local subnet only."
Write-Host 'No existing firewall rules were modified.'

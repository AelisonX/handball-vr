$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$nodePath = (Get-Command node -ErrorAction Stop).Source
$lanIp = $env:HANDBALL_LAN_IP
if (-not $lanIp) {
    $lanIp = (& $nodePath -e 'const os=require("node:os");const entries=Object.entries(os.networkInterfaces()).sort(([a],[b])=>Number(/wi-?fi|wireless/i.test(b))-Number(/wi-?fi|wireless/i.test(a)));const addresses=entries.flatMap(([,items])=>items??[]).filter(x=>x.family==="IPv4"&&!x.internal&&!x.address.startsWith("169.254."));if(addresses.length)console.log(addresses[0].address);').Trim()
}
if (-not $lanIp) { throw 'No local IPv4 address found. Connect this PC to Wi-Fi first.' }
$parsedIp = [System.Net.IPAddress]::Parse($lanIp)
# Store this game's private key outside its Git repository. No trust store is changed.
$tlsDirectory = Join-Path (Split-Path -Parent $projectRoot) 'work\handball-tls'
New-Item -ItemType Directory -Path $tlsDirectory -Force | Out-Null
$certPath = Join-Path $tlsDirectory 'cert.pem'
$keyPath = Join-Path $tlsDirectory 'key.pem'
$ipPath = Join-Path $tlsDirectory 'address.txt'
$refresh = -not ((Test-Path -LiteralPath $certPath) -and (Test-Path -LiteralPath $keyPath) -and (Test-Path -LiteralPath $ipPath))
if (-not $refresh) {
    $refresh = (Get-Content -LiteralPath $ipPath -Raw).Trim() -ne $lanIp
    if (-not $refresh) {
        $existing = [System.Security.Cryptography.X509Certificates.X509Certificate2]::CreateFromPemFile($certPath, $keyPath)
        $refresh = $existing.NotAfter -lt (Get-Date).AddDays(1)
        $existing.Dispose()
    }
}
if ($refresh) {
    $rsa = [System.Security.Cryptography.RSA]::Create(2048)
    try {
        $request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=Handball VR Local', $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
        $san = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
        $san.AddIpAddress($parsedIp)
        $san.AddIpAddress([System.Net.IPAddress]::Loopback)
        $san.AddDnsName('localhost')
        $request.CertificateExtensions.Add($san.Build())
        $cert = $request.CreateSelfSigned([DateTimeOffset]::Now.AddMinutes(-5), [DateTimeOffset]::Now.AddDays(30))
        try {
            [System.IO.File]::WriteAllText($certPath, $cert.ExportCertificatePem())
            [System.IO.File]::WriteAllText($keyPath, $rsa.ExportPkcs8PrivateKeyPem())
            [System.IO.File]::WriteAllText($ipPath, $lanIp)
        } finally { $cert.Dispose() }
    } finally { $rsa.Dispose() }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) { throw 'Build the game with npm run build first.' }
$env:HOST = $lanIp
$env:PORT = '8444'
$env:TLS_CERT = $certPath
$env:TLS_KEY = $keyPath
Write-Host "Quest / PC test address: https://${lanIp}:8444" -ForegroundColor Green
Write-Host 'Keep this window open. Ctrl+C stops the handball server.'
Write-Host 'Use the same Wi-Fi on Quest. Accept the local certificate warning yourself if prompted.'
Write-Host 'Online versus uses this same server for rooms; no Bean There service is used.'
& $nodePath (Join-Path $projectRoot 'server\relay.mjs')

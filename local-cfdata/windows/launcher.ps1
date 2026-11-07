# SPDX-License-Identifier: GPL-3.0-or-later
param([switch]$Install, [switch]$Uninstall, [switch]$Stop)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'forkedgetunnel\CFData'
$protocolKey = 'HKCU:\Software\Classes\forkedgetunnel-cfdata'
$url = 'http://127.0.0.1:13336'
$mutex = New-Object System.Threading.Mutex($false, 'Local\forkedgetunnel-cfdata-launcher')
$locked = $false
try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { exit }
    if ($Uninstall) {
        if (Test-Path -LiteralPath $protocolKey) { Remove-Item -LiteralPath $protocolKey -Recurse }
        Write-Host 'Browser launcher unregistered. CFData files and results were preserved.'
        exit
    }
    if ($Install) {
        $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { 'arm64' } else { 'amd64' }
        $name = "cfdata-windows-$architecture.exe"
        $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'upstream.json') -Raw | ConvertFrom-Json
        $source = Join-Path $PSScriptRoot $name
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.assets.$name) { throw 'CFData binary SHA-256 mismatch.' }
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        foreach ($file in @('launcher.ps1', 'upstream.json', 'LICENSE', 'README.txt')) {
            Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $root $file) -Force
        }
        $destination = Join-Path $root 'cfdata.exe'
        if (-not (Test-Path -LiteralPath $destination) -or (Get-FileHash -LiteralPath $destination).Hash.ToLowerInvariant() -ne $manifest.assets.$name) {
            Copy-Item -LiteralPath $source -Destination $destination -Force
        }
        # The URI is deliberately not passed to PowerShell or to the backend.
        $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $command = '"{0}" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{1}"' -f $powershell, (Join-Path $root 'launcher.ps1')
        New-Item -Path $protocolKey -Force | Out-Null
        Set-Item -LiteralPath $protocolKey -Value 'URL:forkedgetunnel CFData local launcher'
        New-ItemProperty -LiteralPath $protocolKey -Name 'URL Protocol' -Value '' -Force | Out-Null
        $commandKey = Join-Path $protocolKey 'shell\open\command'
        New-Item -Path $commandKey -Force | Out-Null
        Set-Item -LiteralPath $commandKey -Value $command
        Write-Host 'Installed. The local optimizer button can now open CFData in your browser.'
    }
    $binary = Join-Path $root 'cfdata.exe'
    if (-not (Test-Path -LiteralPath $binary)) { throw 'Please run install.cmd from the complete launcher ZIP first.' }
    $installedManifest = Get-Content -LiteralPath (Join-Path $root 'upstream.json') -Raw | ConvertFrom-Json
    $trustedHashes = @($installedManifest.assets.PSObject.Properties.Value)
    if ($trustedHashes -notcontains (Get-FileHash -LiteralPath $binary).Hash.ToLowerInvariant()) { throw 'Installed CFData binary SHA-256 mismatch. Reinstall from the official launcher package.' }
    $known = @(Get-Process -Name 'cfdata' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $binary })
    if (-not $known.Count) {
        if ($Stop) { exit }
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 13336)
        try { $listener.Start() } catch { throw 'Local port 13336 is occupied by another program. It was not stopped.' } finally { $listener.Stop() }
        Start-Process -FilePath $binary -ArgumentList @('-host', '127.0.0.1', '-port', '13336') -WorkingDirectory $root -WindowStyle Hidden
    } elseif ($Stop) {
        $known | Stop-Process
        exit
    }
    $ready = $false
    $deadline = [DateTime]::UtcNow.AddSeconds(90)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200 -and $response.Content -match 'CFData') { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'CFData did not become ready. Check the local service and port 13336, then retry.' }
    Start-Process $url
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'CFData local optimizer') | Out-Null
    exit 1
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}

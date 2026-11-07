# SPDX-License-Identifier: GPL-3.0-or-later
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$work = Join-Path $repo 'build\local-cfdata'
$release = Join-Path $work 'release'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'upstream.json') -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $work, $release | Out-Null
function Download-Checked($name) {
    $target = Join-Path $work $name
    $expected = $manifest.assets.$name
    if (-not (Test-Path -LiteralPath $target) -or (Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant() -ne $expected) {
        Invoke-WebRequest -Uri "https://github.com/PoemMisty/CFData-WEB/releases/download/$($manifest.version)/$name" -OutFile $target -TimeoutSec 180 -MaximumRetryCount 2
    }
    if ((Get-FileHash -LiteralPath $target).Hash.ToLowerInvariant() -ne $expected) { throw "SHA-256 mismatch: $name" }
    return $target
}
foreach ($asset in $manifest.assets.PSObject.Properties.Name) { Download-Checked $asset | Out-Null }
$license = Join-Path $PSScriptRoot 'LICENSE'
if (-not (Test-Path -LiteralPath $license)) { throw 'Missing local-cfdata/LICENSE' }
$sourceZip = Join-Path $release 'CFData-WEB-v1.8.5-source.zip'
if (-not (Test-Path -LiteralPath $sourceZip)) { Invoke-WebRequest -Uri $manifest.source -OutFile $sourceZip -TimeoutSec 180 -MaximumRetryCount 2 }

$windows = Join-Path $work 'windows'
New-Item -ItemType Directory -Force -Path $windows | Out-Null
foreach ($name in @('cfdata-windows-amd64.exe', 'cfdata-windows-arm64.exe')) { Copy-Item -LiteralPath (Join-Path $work $name) -Destination $windows -Force }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'upstream.json'), $license -Destination $windows -Force
foreach ($name in @('launcher.ps1', 'install.cmd', 'stop.cmd')) {
    $text = [IO.File]::ReadAllText((Join-Path $PSScriptRoot "windows\$name"))
    [IO.File]::WriteAllText((Join-Path $windows $name), $text, (New-Object Text.UTF8Encoding($true)))
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'README.md') -Destination (Join-Path $windows 'README.txt') -Force
Compress-Archive -Path "$windows\*" -DestinationPath (Join-Path $release 'CFData-Local-Windows-1.0.0.zip') -Force

Copy-Item -LiteralPath $license -Destination $release -Force
$hashes = Get-ChildItem -LiteralPath $release -File | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object { '{0}  {1}' -f (Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant(), $_.Name }
[IO.File]::WriteAllLines((Join-Path $release 'SHA256SUMS.txt'), $hashes)
Write-Host "Release artifacts: $release"

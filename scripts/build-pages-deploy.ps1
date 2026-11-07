# SPDX-License-Identifier: GPL-2.0
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$根目录 = Split-Path $PSScriptRoot -Parent
$输出目录 = Join-Path $根目录 'build/pages-deploy/release'
$null = New-Item -ItemType Directory -Path $输出目录 -Force
$压缩包路径 = Join-Path $输出目录 'Pages-Deploy-Windows.zip'
# Explicit files only: never bundle local credentials, recovery records or build caches.
$文件映射 = [ordered]@{
    'redeploy-pages.cmd' = 'redeploy-pages.cmd'
    'refresh-pages-token.cmd' = 'refresh-pages-token.cmd'
    'scripts/redeploy-pages.ps1' = 'scripts/redeploy-pages.ps1'
    '使用说明.txt' = 'docs/pages-deploy-package.txt'
    'LICENSE' = 'LICENSE'
}
foreach ($源文件 in $文件映射.Values) {
    if (-not (Test-Path -LiteralPath (Join-Path $根目录 $源文件) -PathType Leaf)) { throw "缺少打包文件：$源文件" }
}
$流 = [IO.File]::Create($压缩包路径)
try {
    $压缩包 = [IO.Compression.ZipArchive]::new($流, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($名称 in $文件映射.Keys) {
            $null = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($压缩包, (Join-Path $根目录 $文件映射[$名称]), $名称)
        }
    } finally { $压缩包.Dispose() }
} finally { $流.Dispose() }
$校验值 = (Get-FileHash -LiteralPath $压缩包路径 -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $输出目录 'SHA256SUMS.txt'), "$校验值  Pages-Deploy-Windows.zip`n", [Text.Encoding]::ASCII)
Write-Host "部署包已生成：$压缩包路径"

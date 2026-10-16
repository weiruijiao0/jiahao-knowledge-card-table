param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$jiahaoRoot = [IO.Path]::GetFullPath($PSScriptRoot)
if (-not $jiahaoRoot.StartsWith('D:\', [StringComparison]::OrdinalIgnoreCase)) { throw '请将本项目放在 D 盘后运行。' }
$jiahaoParent = Split-Path -Parent $jiahaoRoot
$jiahaoScratch = if ((Split-Path -Leaf $jiahaoParent) -eq 'outputs') { Join-Path (Split-Path -Parent $jiahaoParent) 'work' } else { Join-Path $jiahaoRoot 'work' }
foreach ($jiahaoName in @('temp','cache\npm','cache\playwright')) { New-Item -ItemType Directory -Force -Path (Join-Path $jiahaoScratch $jiahaoName) | Out-Null }
$env:TEMP = Join-Path $jiahaoScratch 'temp'
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
$env:npm_config_cache = Join-Path $jiahaoScratch 'cache\npm'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $jiahaoScratch 'cache\playwright'
Set-Location -LiteralPath $jiahaoRoot
node scripts/serve.mjs "--port=$Port"

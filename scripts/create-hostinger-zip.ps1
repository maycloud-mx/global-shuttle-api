$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$deployDirectory = Join-Path $projectRoot 'deploy'
$archivePath = Join-Path $deployDirectory 'global-shuttle-api-hostinger-runtime-fix.zip'
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("global-shuttle-hostinger-" + [guid]::NewGuid().ToString('N'))

$excludedDirectories = @(
  '.git',
  '.idea',
  '.vscode',
  'coverage',
  'deploy',
  'dist',
  'node_modules',
  'test'
)
$excludedFiles = @(
  '.env',
  '.env.development.local',
  '.env.local',
  '.env.production.local',
  '.env.test.local',
  'tsconfig.build.tsbuildinfo'
)

try {
  New-Item -ItemType Directory -Path $stagingRoot | Out-Null

  Get-ChildItem -LiteralPath $projectRoot -Force | Where-Object {
    if ($_.PSIsContainer) {
      $excludedDirectories -notcontains $_.Name
    } else {
      $excludedFiles -notcontains $_.Name
    }
  } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stagingRoot -Recurse -Force
  }

  $generatedPrisma = Join-Path $stagingRoot 'src\generated'
  if (Test-Path -LiteralPath $generatedPrisma) {
    Remove-Item -LiteralPath $generatedPrisma -Recurse -Force
  }
  Get-ChildItem -LiteralPath (Join-Path $stagingRoot 'src') -Recurse -File -Filter '*.spec.ts' |
    Remove-Item -Force

  $requiredFiles = @(
    'package.json',
    'package-lock.json',
    'prisma\schema.prisma',
    'scripts\copy-prisma-client.mjs',
    'scripts\verify-build-source.mjs',
    'src\http\api-exception.filter.ts',
    'src\http\api-message.decorator.ts',
    'src\http\api-response.interceptor.ts',
    'src\main.ts',
    'tsconfig.build.json'
  )
  foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $stagingRoot $requiredFile))) {
      throw "Required deployment file is missing: $requiredFile"
    }
  }

  New-Item -ItemType Directory -Path $deployDirectory -Force | Out-Null
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
  Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal

  $archive = Get-Item -LiteralPath $archivePath
  Write-Host "Hostinger package created: $($archive.FullName)"
  Write-Host "Size: $([math]::Round($archive.Length / 1MB, 2)) MB"
} finally {
  $resolvedTemp = [System.IO.Path]::GetFullPath($stagingRoot)
  $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedTemp.StartsWith($systemTemp) -and (Test-Path -LiteralPath $resolvedTemp)) {
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
  }
}

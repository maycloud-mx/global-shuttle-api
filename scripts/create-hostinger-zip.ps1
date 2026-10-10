$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$deployDirectory = Join-Path $projectRoot 'deploy'
$archivePath = Join-Path $deployDirectory 'global-shuttle-api-hostinger.zip'
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("global-shuttle-hostinger-" + [guid]::NewGuid().ToString('N'))

$excludedDirectories = @(
  '.git',
  '.agents',
  '.aws',
  '.codex',
  '.idea',
  '.vscode',
  'coverage',
  'deploy',
  'dist',
  'node_modules',
  'test'
)
$excludedFiles = @('tsconfig.build.tsbuildinfo')

try {
  Push-Location $projectRoot
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "Production build failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }

  New-Item -ItemType Directory -Path $stagingRoot | Out-Null

  Get-ChildItem -LiteralPath $projectRoot -Force | Where-Object {
    if ($_.PSIsContainer) {
      $excludedDirectories -notcontains $_.Name
    } else {
      $excludedFiles -notcontains $_.Name -and
        $_.Name -ne '.env' -and
        -not $_.Name.StartsWith('.env.')
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

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $unsafeEntries = @($zip.Entries | Where-Object {
      $entryPath = $_.FullName.Replace('\', '/')
      $entryName = [System.IO.Path]::GetFileName($entryPath)
      $entryPath -match '(^|/)(node_modules|dist|deploy|test|\.git|\.aws|\.codex|\.agents)/' -or
        $entryName -eq '.env' -or
        $entryName.StartsWith('.env.') -or
        $entryName.EndsWith('.spec.ts')
    })
    if ($unsafeEntries.Count -gt 0) {
      throw "Deployment package contains excluded files: $($unsafeEntries.FullName -join ', ')"
    }
  } finally {
    $zip.Dispose()
  }

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


# fetch_gate_models_from_har_fixed.ps1
# Robust downloader for Ultra gate model JSONs listed in embedded manifest.
# Uses curl.exe with TLS + browser-like headers, retries, and creates gate_tool\m\... structure.

$ErrorActionPreference = "Stop"

# Force TLS 1.2 (and 1.3 if available) for any .NET calls
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor 3072
} catch {}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$gateTool = Join-Path $here "gate_tool"
if (-not (Test-Path $gateTool)) {
  throw "Expected folder 'gate_tool' next to this script. Current folder: $here"
}

# Manifest: relative_path|url
$manifestLines = @'
m/0/po12.json|https://www.ultrafence.com/design-studio/gates/m/0/po12.json
m/0/po14.json|https://www.ultrafence.com/design-studio/gates/m/0/po14.json
m/0/po23.json|https://www.ultrafence.com/design-studio/gates/m/0/po23.json
m/0/po40d.json|https://www.ultrafence.com/design-studio/gates/m/0/po40d.json
m/0/po40s.json|https://www.ultrafence.com/design-studio/gates/m/0/po40s.json
m/1/rb1.json|https://www.ultrafence.com/design-studio/gates/m/1/rb1.json
m/1/rb2.json|https://www.ultrafence.com/design-studio/gates/m/1/rb2.json
m/1/rt1a.json|https://www.ultrafence.com/design-studio/gates/m/1/rt1a.json
m/1/rt1e.json|https://www.ultrafence.com/design-studio/gates/m/1/rt1e.json
m/1/rt1r.json|https://www.ultrafence.com/design-studio/gates/m/1/rt1r.json
m/1/rt1s.json|https://www.ultrafence.com/design-studio/gates/m/1/rt1s.json
m/1/rt2a.json|https://www.ultrafence.com/design-studio/gates/m/1/rt2a.json
m/1/rt2e.json|https://www.ultrafence.com/design-studio/gates/m/1/rt2e.json
m/1/rt2r.json|https://www.ultrafence.com/design-studio/gates/m/1/rt2r.json
m/1/rt2s.json|https://www.ultrafence.com/design-studio/gates/m/1/rt2s.json
m/2/pb1e.json|https://www.ultrafence.com/design-studio/gates/m/2/pb1e.json
m/2/pb1o.json|https://www.ultrafence.com/design-studio/gates/m/2/pb1o.json
m/2/pb1x.json|https://www.ultrafence.com/design-studio/gates/m/2/pb1x.json
m/2/pb2e.json|https://www.ultrafence.com/design-studio/gates/m/2/pb2e.json
m/2/pb2o.json|https://www.ultrafence.com/design-studio/gates/m/2/pb2o.json
m/2/pb2x.json|https://www.ultrafence.com/design-studio/gates/m/2/pb2x.json
m/2/pt1ae.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1ae.json
m/2/pt1ao.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1ao.json
m/2/pt1ax.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1ax.json
m/2/pt1ee.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1ee.json
m/2/pt1eo.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1eo.json
m/2/pt1ex.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1ex.json
m/2/pt1re.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1re.json
m/2/pt1ro.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1ro.json
m/2/pt1rx.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1rx.json
m/2/pt1se.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1se.json
m/2/pt1so.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1so.json
m/2/pt1sx.json|https://www.ultrafence.com/design-studio/gates/m/2/pt1sx.json
m/2/pt2ae.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2ae.json
m/2/pt2ao.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2ao.json
m/2/pt2ax.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2ax.json
m/2/pt2ee.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2ee.json
m/2/pt2eo.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2eo.json
m/2/pt2ex.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2ex.json
m/2/pt2re.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2re.json
m/2/pt2ro.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2ro.json
m/2/pt2rx.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2rx.json
m/2/pt2se.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2se.json
m/2/pt2so.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2so.json
m/2/pt2sx.json|https://www.ultrafence.com/design-studio/gates/m/2/pt2sx.json
m/3/acs.json|https://www.ultrafence.com/design-studio/gates/m/3/acs.json
m/3/acb.json|https://www.ultrafence.com/design-studio/gates/m/3/acb.json
m/3/acc.json|https://www.ultrafence.com/design-studio/gates/m/3/acc.json
m/3/fs.json|https://www.ultrafence.com/design-studio/gates/m/3/fs.json
m/3/ft.json|https://www.ultrafence.com/design-studio/gates/m/3/ft.json
m/3/fq.json|https://www.ultrafence.com/design-studio/gates/m/3/fq.json
m/3/fp.json|https://www.ultrafence.com/design-studio/gates/m/3/fp.json
m/3/hng.json|https://www.ultrafence.com/design-studio/gates/m/3/hng.json
m/3/pcf.json|https://www.ultrafence.com/design-studio/gates/m/3/pcf.json
m/3/pcb.json|https://www.ultrafence.com/design-studio/gates/m/3/pcb.json
m/3/ufr1.json|https://www.ultrafence.com/design-studio/gates/m/3/ufr1.json
m/3/ufr2.json|https://www.ultrafence.com/design-studio/gates/m/3/ufr2.json
'@.Trim().Split("`n")

$manifest = @()
foreach ($line in $manifestLines) {
  if (-not $line) { continue }
  $parts = $line.Trim().Split("|")
  if ($parts.Length -ne 2) { continue }
  $manifest += [PSCustomObject]@{ rel=$parts[0]; url=$parts[1] }
}

function Ensure-Dir($path) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

function Download-With-Curl($url, $outPath) {
  $ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  $referer = "https://www.ultrafence.com/design-studio/gates/"
  $args = @(
    "-L",
    "--retry", "8",
    "--retry-delay", "1",
    "--retry-connrefused",
    "--fail",
    "-A", $ua,
    "-H", "Referer: $referer",
    "-H", "Accept: application/json,text/plain,*/*",
    "-o", $outPath,
    $url
  )
  $p = Start-Process -FilePath "curl.exe" -ArgumentList $args -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}

$failures = @()

foreach ($f in $manifest) {
  $outPath = Join-Path $gateTool ($f.rel.Replace("/", "\"))
  Ensure-Dir $outPath

  if (Test-Path $outPath) {
    $len = (Get-Item $outPath).Length
    if ($len -gt 50) { continue }
  }

  Write-Host "Downloading $($f.url) -> $outPath"
  $code = Download-With-Curl $f.url $outPath
  if ($code -ne 0) {
    $failures += $f
    Write-Warning "Failed (curl exit $code): $($f.url)"
  } else {
    $len = (Get-Item $outPath).Length
    if ($len -lt 50) {
      $failures += $f
      Write-Warning "Downloaded but file seems too small ($len bytes): $($f.url)"
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "FAILED DOWNLOADS:" -ForegroundColor Red
  foreach ($ff in $failures) {
    Write-Host " - $($ff.rel)  ($($ff.url))"
  }
  Write-Host ""
  throw "Some files failed to download. Causes: antivirus SSL inspection, proxy, or server blocking. Try: run from home network, disable SSL-inspecting VPN/proxy, or open the URL in Chrome once then re-run."
}

Write-Host ""
Write-Host "All model JSON files downloaded successfully."
Write-Host "Next: open http://localhost:8000/gate_tool/index.html and confirm Network shows 200s for m/*.json"

$ErrorActionPreference = "Stop"
$Port=8081
$Root=(Get-Location).Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/  (Ctrl+C to stop)"

$mime = @{
  ".html"="text/html"
  ".js"="application/javascript"
  ".css"="text/css"
  ".png"="image/png"
  ".jpg"="image/jpeg"
  ".jpeg"="image/jpeg"
  ".webp"="image/webp"
  ".json"="application/json"
  ".hdr"="application/octet-stream"
}

while($listener.IsListening){
  $ctx = $null
  try { $ctx = $listener.GetContext() } catch { continue }

  $req = $ctx.Request
  $res = $ctx.Response

  try {
    $path = $req.Url.AbsolutePath.TrimStart('/')
    if([string]::IsNullOrWhiteSpace($path)){ $path = "gate_tool/index.html" }

    $file = Join-Path $Root $path
    if(Test-Path $file -PathType Leaf){
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = $(if($mime.ContainsKey($ext)){$mime[$ext]}else{"application/octet-stream"})
      $res.ContentLength64 = $bytes.Length

      try { $res.OutputStream.Write($bytes,0,$bytes.Length) } catch { }
    } else {
      $res.StatusCode = 404
    }
  } finally {
    try { $res.OutputStream.Close() } catch { }
    try { $res.Close() } catch { }
  }
}

Grandview Fence Design Studio (v11-customer)
Build time: 2026-01-01 05:58 UTC

Run on Windows WITHOUT Python/Node (PowerShell local server)
-----------------------------------------------------------
1) Unzip this folder so you can see:
   - index.html
   - app.js
   - styles.css
   - catalog.json
   - assets/

2) Open PowerShell in THIS folder:
   - In File Explorer, open the folder
   - Click the address bar, type: powershell
   - Press Enter

3) Paste this into PowerShell and press Enter:

$Port = 8000
$Root = (Get-Location).Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/  (Ctrl+C to stop)"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  $path = $req.Url.AbsolutePath.TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

  $file = Join-Path $Root $path

  if (Test-Path $file -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($file)

    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $contentType = switch ($ext) {
      ".html" { "text/html" }
      ".js"   { "application/javascript" }
      ".css"  { "text/css" }
      ".png"  { "image/png" }
      ".jpg"  { "image/jpeg" }
      ".jpeg" { "image/jpeg" }
      ".webp" { "image/webp" }
      ".json" { "application/json" }
      default { "application/octet-stream" }
    }

    $res.ContentType = $contentType
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
  }

  $res.OutputStream.Close()
}

4) Open the site in a browser:
   http://localhost:8000

Stop the server:
- Go back to PowerShell and press Ctrl+C

Notes
-----
- Customer build: fence position is locked (no zoom/move).
- No export branding.

- Clean URL mode: The address bar stays clean (no ?x=...&y=...). Selections persist on this device via localStorage.
- If changes don’t appear, you are likely serving the wrong folder or cached files. Fix:
  1) Stop server (Ctrl+C)
  2) Start server in the new unzipped folder
  3) Hard refresh in browser (Ctrl+Shift+R) or use Incognito


UI notes:
- Accent color set to orange (#f97316). If you want your exact brand hex, tell me and I’ll swap it.
- If the dropdown doesn’t open, confirm you’re running this build and hard refresh (Ctrl+Shift+R).


Troubleshooting:
- If dropdown/buttons stop responding: open in Incognito or clear site data for localhost (localStorage).
- If background/overlays don't render: check browser console for 404s (assets paths) and confirm server is started in the folder containing index.html.

NEW: Gate Design Studio
- Open http://localhost:8000/gates.html to use the gate tool.


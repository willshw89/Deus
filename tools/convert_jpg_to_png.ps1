Add-Type -AssemblyName System.Drawing

$files = @(
  'art/raw/u7_female_modular_portraits_nano_pro.jpg',
  'art/raw/human_child_walk_nano_pro.jpg',
  'art/raw/modular_hair_beards_nano_pro.jpg'
)

foreach ($f in $files) {
  $fullPath = Resolve-Path $f
  $pngPath = $f -replace '\.jpg$', '.png'
  $fullPng = Join-Path (Get-Location) $pngPath
  $img = [System.Drawing.Image]::FromFile($fullPath)
  $img.Save($fullPng, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose()
  Write-Host "Saved $pngPath"
}

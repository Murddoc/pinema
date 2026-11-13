Add-Type -AssemblyName System.Drawing
$proj =Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # racine du projet
$outDir = Join-Path $proj "design\rideaux"
New-Item -ItemType Directory -Force $outDir | Out-Null

$RED = [System.Drawing.Color]::FromArgb(255, 0xE5, 0x24, 0x3B)
$DARK = [System.Drawing.Color]::FromArgb(255, 0x16, 0x15, 0x1A)
$WHITE = [System.Drawing.Color]::White

function RR($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); return $p
}
function Pt($x, $y) { New-Object System.Drawing.PointF ([float]$x), ([float]$y) }
function Poly($pts) { $p = New-Object System.Drawing.Drawing2D.GraphicsPath; $p.AddPolygon([System.Drawing.PointF[]]$pts); return $p }
# Rideau gauche : haut (x0..xTop), courbe jusqu'à (xLow, yLow), puis tombe jusqu'en bas
function Curtain($x0, $yTop, $xTop, $c1y, $c2x, $c2y, $xLow, $yLow, $yBot, [bool]$mirror, $W) {
  $f = { param($x) if ($mirror) { $W - $x } else { $x } }
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddLine((Pt (& $f $x0) $yTop), (Pt (& $f $xTop) $yTop))
  $p.AddBezier((Pt (& $f $xTop) $yTop), (Pt (& $f $xTop) $c1y), (Pt (& $f $c2x) $c2y), (Pt (& $f $xLow) $yLow))
  $p.AddLine((Pt (& $f $xLow) $yLow), (Pt (& $f $xLow) $yBot))
  $p.AddLine((Pt (& $f $xLow) $yBot), (Pt (& $f $x0) $yBot))
  $p.CloseFigure(); return $p
}

# Dessin de référence (grille 32), identique à la piste 06 de la planche
function DrawMaster($g) {
  $tile = RR 0 0 32 32 7
  $g.FillPath((New-Object System.Drawing.SolidBrush $DARK), $tile)
  $g.SetClip($tile)
  $red = New-Object System.Drawing.SolidBrush $RED
  $g.FillPath($red, (RR 2 2 28 4 1.5))
  $g.FillPath($red, (Curtain 2 5 9.5 11.5 7.7 16.5 4.5 19.5 30 $false 32))
  $g.FillPath($red, (Curtain 2 5 9.5 11.5 7.7 16.5 4.5 19.5 30 $true 32))
  # punaise : translate(6.08 7.64) scale(.62)
  $s = 0.62; $tx = 16 - 16 * $s; $ty = 9.5 - 3 * $s
  $P = { param($x, $y) Pt ($tx + $x * $s) ($ty + $y * $s) }
  $w = New-Object System.Drawing.SolidBrush $WHITE
  $g.FillPath($w, (Poly @((& $P 10 3), (& $P 22 3), (& $P 22 6), (& $P 20 6), (& $P 21.5 14), (& $P 24 14), (& $P 24 17), (& $P 8 17), (& $P 8 14), (& $P 10.5 14), (& $P 12 6), (& $P 10 6))))
  $g.FillPath($w, (Poly @((& $P 15 17), (& $P 17 17), (& $P 16 28))))
  $g.ResetClip()
}

# Version 16 px dessinée sur la grille des pixels (bords nets, punaise simplifiée)
function Draw16($g) {
  $tile = RR 0 0 16 16 3
  $g.FillPath((New-Object System.Drawing.SolidBrush $DARK), $tile)
  $g.SetClip($tile)
  $red = New-Object System.Drawing.SolidBrush $RED
  $g.FillRectangle($red, 1, 1, 14, 2)                       # lambrequin
  $g.FillPath($red, (Curtain 1 2 5 6 4.6 9 3 11 16 $false 16))
  $g.FillPath($red, (Curtain 1 2 5 6 4.6 9 3 11 16 $true 16))
  $w = New-Object System.Drawing.SolidBrush $WHITE
  $g.FillRectangle($w, 6, 4, 4, 2)                          # tête
  $g.FillRectangle($w, 7, 6, 2, 2)                          # corps
  $g.FillRectangle($w, 5, 8, 6, 2)                          # collerette
  $g.FillPath($w, (Poly @((Pt 7 10), (Pt 9 10), (Pt 8 14)))) # aiguille
  $g.ResetClip()
}

function Render($size, $units, $draw, $pad, $file) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $art = $size - 2 * $pad
  $g.TranslateTransform($pad, $pad); $g.ScaleTransform($art / $units, $art / $units)
  & $draw $g
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); return $bmp
}

$b16a = Render 16 32 ${function:DrawMaster} 0 "$outDir\icon16-reduit.png"
$b16b = Render 16 16 ${function:Draw16} 0 "$outDir\icon16-pixel.png"
$b32 = Render 32 32 ${function:DrawMaster} 0 "$outDir\icon32.png"
$b48 = Render 48 32 ${function:DrawMaster} 0 "$outDir\icon48.png"
$b128 = Render 128 32 ${function:DrawMaster} 0 "$outDir\icon128.png"
$b128p = Render 128 32 ${function:DrawMaster} 16 "$outDir\icon128-store.png"   # 96 px + 16 px de marge (recommandation Web Store)

# Planche de comparaison : 16 px réduit vs recalé, en vrai et zoomés ×8, sur barres claire et sombre
$sheet = New-Object System.Drawing.Bitmap 760, 330
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::FromArgb(244, 243, 242))
$g.TextRenderingHint = 'AntiAliasGridFit'
$font = New-Object System.Drawing.Font "Segoe UI", 13, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$x = 20
foreach ($pair in @(@($b16a, "A. 128 reduit en 16"), @($b16b, "B. redessine au pixel"))) {
  $g.DrawString($pair[1], $font, [System.Drawing.Brushes]::Black, $x, 12)
  $g.InterpolationMode = 'NearestNeighbor'; $g.PixelOffsetMode = 'Half'
  $g.FillRectangle([System.Drawing.Brushes]::White, $x, 40, 128, 128)
  $g.DrawImage($pair[0], $x, 40, 128, 128)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(53, 54, 58))), $x + 140, 40, 128, 128)
  $g.DrawImage($pair[0], $x + 140, 40, 128, 128)
  $g.PixelOffsetMode = 'None'
  foreach ($bar in @(@(255, 255, 255, 190), @(53, 54, 58, 240))) {
    $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($bar[0], $bar[1], $bar[2]))), $x, $bar[3], 268, 34)
    $g.DrawImageUnscaled($pair[0], $x + 126, $bar[3] + 9)
  }
  $x += 300
}
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawString("128 / 48 / 32", $font, [System.Drawing.Brushes]::Black, 620, 12)
$g.DrawImage($b128, 620, 40, 128, 128); $g.DrawImageUnscaled($b48, 620, 190); $g.DrawImageUnscaled($b32, 680, 198)
$sheet.Save("$outDir\comparaison-16.png", [System.Drawing.Imaging.ImageFormat]::Png)
"ok"

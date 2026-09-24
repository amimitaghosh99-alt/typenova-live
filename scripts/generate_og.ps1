Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# 1. Base dark fill (#080809)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 8, 9))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# 2. Draw background wallpaper with dark atmospheric gradient
$wallPath = (Get-Item 'public/wallpapers/cyber-monolith.jpg').FullName
if (Test-Path $wallPath) {
    $wall = [System.Drawing.Image]::FromFile($wallPath)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $srcRect = New-Object System.Drawing.Rectangle(600, 200, 2640, 1386)
    $g.DrawImage($wall, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $wall.Dispose()
    
    # Heavy moody vignette / darkening overlay (86% opacity)
    $overlayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 8, 8, 10))
    $g.FillRectangle($overlayBrush, 0, 0, $width, $height)
}

# Subtle cyan top accent line
$topLinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(240, 34, 211, 238), 3)
$g.DrawLine($topLinePen, 0, 0, $width, 0)
$topLinePen.Dispose()

# 4. Draw Logo
$logoPath = (Get-Item 'public/logo.png').FullName
if (Test-Path $logoPath) {
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $logoSize = 250
    $logoX = 110
    $logoY = [int](($height - $logoSize) / 2)
    $g.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)
    $logo.Dispose()
}

# 5. Draw Typography
# Category / Eyebrow
$eyebrowFont = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$eyebrowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 34, 211, 238))
$g.DrawString("NEXT-GEN TYPING ECOSYSTEM", $eyebrowFont, $eyebrowBrush, 410, 145)

# Main Title
$titleFont = New-Object System.Drawing.Font("Segoe UI", 56, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.DrawString("TYPENOVA", $titleFont, $titleBrush, 405, 175)

# Tagline
$taglineFont = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Regular)
$taglineBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 228, 228, 231))
$g.DrawString("AI Coach  /  CyberHands RPG  /  Multiplayer", $taglineFont, $taglineBrush, 410, 265)

# Feature bullets
$subFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 161, 161, 170))
$bulletText = "Master touch typing with real-time diagnostics, audio dictation," + [Environment]::NewLine + "sensory keycaps, and global competitive racing circuits."
$g.DrawString($bulletText, $subFont, $subBrush, 410, 315)

# Badges
$pillBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 24, 24, 27))
$pillBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 255, 255, 255), 1)
$pillFont = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$pillTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))

$badges = @("100% AD-FREE", "REALTIME MULTIPLAYER", "AI DIAGNOSTICS", "TACTILE AUDIO")
$badgeX = 410
$badgeY = 405

foreach ($b in $badges) {
    $size = $g.MeasureString($b, $pillFont)
    $pWidth = [int]$size.Width + 20
    $pHeight = 32
    $rect = New-Object System.Drawing.Rectangle($badgeX, $badgeY, $pWidth, $pHeight)
    $g.FillRectangle($pillBg, $rect)
    $g.DrawRectangle($pillBorder, $rect)
    $g.DrawString($b, $pillFont, $pillTextBrush, ($badgeX + 10), ($badgeY + 6))
    $badgeX += $pWidth + 12
}

# Footer domain tag
$footerFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
$footerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 212, 212, 216))
$g.DrawString("typenova.app  /  play instantly in browser", $footerFont, $footerBrush, 410, 465)

# Save
$outPath = (Join-Path (Get-Location) 'public/og.png')
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$outBannerPath = (Join-Path (Get-Location) 'public/og-banner.png')
$bmp.Save($outBannerPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$g.Dispose()
$bmp.Dispose()
Write-Output "Successfully updated $outPath and $outBannerPath"

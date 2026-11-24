$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Join-Path $projectRoot "apps\mobile"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  LOKAYANA AI - Fix iOS Duplicate React Error" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

$rootNodeModules = Join-Path $projectRoot "node_modules"
if (Test-Path $rootNodeModules) {
    Write-Host "[1/5] Menghapus root node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $rootNodeModules
    Write-Host "      OK - root node_modules dihapus" -ForegroundColor Green
} else {
    Write-Host "[1/5] root node_modules sudah tidak ada. Lanjut..." -ForegroundColor Green
}

$lockFile = Join-Path $projectRoot ".git\index.lock"
if (Test-Path $lockFile) {
    Write-Host "[2/5] Menghapus .git/index.lock..." -ForegroundColor Yellow
    Remove-Item -Force $lockFile
    Write-Host "      OK" -ForegroundColor Green
} else {
    Write-Host "[2/5] Tidak ada .git/index.lock. Lanjut..." -ForegroundColor Green
}

Write-Host "[3/5] Git add & commit semua perubahan..." -ForegroundColor Yellow
Set-Location $projectRoot
git add apps/mobile/src/screens/HomeScreen.tsx apps/mobile/metro.config.js package.json fix-ios-error.ps1
$commitMsg = "fix(mobile): Semua category + metro blockList iOS fix case-insensitive"
$existing = git log --oneline -1
if ($existing -match "fix.mobile.: Semua category") {
    git commit --amend -m $commitMsg
} else {
    git commit -m $commitMsg
}
Write-Host "      OK - commit berhasil" -ForegroundColor Green

Write-Host "[4/5] Force push ke GitHub..." -ForegroundColor Yellow
git push origin feature/mobile-app --force
Write-Host "      OK - GitHub updated" -ForegroundColor Green

Write-Host "[5/5] Membersihkan Expo cache..." -ForegroundColor Yellow
Set-Location $mobileDir
$expoCache = Join-Path $mobileDir ".expo"
if (Test-Path $expoCache) {
    Remove-Item -Recurse -Force $expoCache
    Write-Host "      .expo cache dihapus" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  SELESAI! Sekarang jalankan:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  cd apps\mobile" -ForegroundColor White
Write-Host "  npx expo start -c" -ForegroundColor White
Write-Host ""
Write-Host "  Jalankan dari folder apps\mobile, BUKAN dari root!" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
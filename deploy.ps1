# Redeploy Forge Studio Pro to GitHub Pages.
#   1. Saves your source changes to GitHub (main branch)
#   2. Builds the app
#   3. Publishes the build to the gh-pages branch (what the live site serves)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$remote = (git remote get-url origin).Trim()

# 1) Source code -> main
$changes = git status --porcelain
if ($changes) {
    $msg = Read-Host 'Describe your changes (Enter for "Update Forge Studio Pro")'
    if (-not $msg) { $msg = 'Update Forge Studio Pro' }
    git add -A
    git commit -q -m $msg
}
git push -q origin main
if ($LASTEXITCODE -ne 0) { throw 'Pushing source to GitHub failed.' }
Write-Host 'Source saved to GitHub.' -ForegroundColor Green

# 2) Build
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed - nothing was published.' }

# 3) Publish dist/ -> gh-pages
Set-Location dist
New-Item -ItemType File -Force .nojekyll | Out-Null
if (Test-Path .git) { Remove-Item -Recurse -Force .git }
git init -q -b gh-pages
git add -A
$sha = (git -C .. rev-parse --short HEAD).Trim()
git commit -q -m "Deploy $sha"
git push -q -f $remote gh-pages
$ok = $LASTEXITCODE
Remove-Item -Recurse -Force .git
Set-Location ..
if ($ok -ne 0) { throw 'Publishing to gh-pages failed.' }

$user = ($remote -replace '.*github\.com[/:]', '' -split '/')[0]
$repo = (($remote -split '/')[-1]) -replace '\.git$', ''
Write-Host ''
Write-Host "Published! Live in about 1 minute at: https://$user.github.io/$repo/" -ForegroundColor Green
Write-Host 'Tip: if you still see the old version, reload the page twice (the app caches itself for offline use).'

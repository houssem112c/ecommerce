# Quick Deployment Script for E-commerce App

Write-Host "🚀 E-commerce App - Deployment Helper" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path .git)) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# Check if remote exists
$remote = git remote -v 2>$null
if (-not $remote) {
    Write-Host ""
    Write-Host "⚠️  No Git remote configured" -ForegroundColor Yellow
    Write-Host "Please create a GitHub repository and run:" -ForegroundColor Yellow
    Write-Host "  git remote add origin YOUR_GITHUB_REPO_URL" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ Git remote configured" -ForegroundColor Green
}

# Show current status
Write-Host ""
Write-Host "📊 Current Status:" -ForegroundColor Cyan
git status --short

# Ask to commit
Write-Host ""
$commit = Read-Host "Do you want to commit changes? (y/n)"

if ($commit -eq 'y' -or $commit -eq 'Y') {
    git add .
    $message = Read-Host "Enter commit message (default: 'Update ecommerce app')"
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = "Update ecommerce app"
    }
    git commit -m "$message"
    Write-Host "✅ Changes committed" -ForegroundColor Green
    
    # Ask to push
    Write-Host ""
    $push = Read-Host "Do you want to push to remote? (y/n)"
    if ($push -eq 'y' -or $push -eq 'Y') {
        git push
        Write-Host "✅ Pushed to remote" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Deployment will start automatically on Render!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Create a new Web Service from your GitHub repo" -ForegroundColor White
Write-Host "3. Use the settings from DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full guide: See DEPLOYMENT.md" -ForegroundColor Yellow

# Script para deploy do frontend no GitHub Pages
# Uso: .\deploy-github-pages.ps1 -BackendUrl "https://seu-backend.run.app"

param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,
    
    [Parameter(Mandatory = $false)]
    [string]$RepoName = "planning_poker",
    
    [Parameter(Mandatory = $false)]
    [string]$Branch = "main"
)

Write-Host "🚀 Iniciando deploy no GitHub Pages..." -ForegroundColor Green
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "frontend")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Navegar para o diretório do frontend
Push-Location frontend

try {
    Write-Host "[*] Instalando dependencias..." -ForegroundColor Yellow
    npm install
    
    Write-Host ""
    Write-Host "[*] Fazendo build para GitHub Pages..." -ForegroundColor Yellow
    
    # Substituir URL do backend no env.js antes do build
    $envJsPath = "public\assets\env.js"
    $envJsContent = Get-Content $envJsPath -Raw
    
    # Substituir placeholder pela URL real do backend
    $envJsContent = $envJsContent -replace "https://SEU-BACKEND\.run\.app", $BackendUrl
    
    # Se não houver placeholder, adicionar variável global
    if ($envJsContent -notmatch "__BACKEND_URL__") {
        $envJsContent = $envJsContent -replace "var backendUrl = window\.__BACKEND_URL__", "window.__BACKEND_URL__ = '$BackendUrl';`n    var backendUrl = window.__BACKEND_URL__"
    }
    
    Set-Content $envJsPath $envJsContent
    
    # Fazer build para GitHub Pages
    npm run build:github-pages
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Erro ao fazer build!" -ForegroundColor Red
        exit 1
    }
    
    # Copiar 404.html para a pasta de output
    $distPath = "dist\frontend\browser"
    if (Test-Path $distPath) {
        Copy-Item "public\404.html" "$distPath\404.html" -Force
        Write-Host "[OK] 404.html copiado para dist" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[OK] Build concluido!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Proximos passos:" -ForegroundColor Yellow
    Write-Host "1. Navegue ate a pasta: frontend\dist\frontend\browser" -ForegroundColor White
    Write-Host "2. Verifique se o arquivo env.js contem a URL correta do backend: $BackendUrl" -ForegroundColor White
    Write-Host "3. Faca commit e push da pasta dist/frontend/browser para a branch gh-pages" -ForegroundColor White
    Write-Host ""
    Write-Host "[DICA] Use o GitHub Actions para automatizar o deploy!" -ForegroundColor Cyan
    
}
finally {
    Pop-Location
}

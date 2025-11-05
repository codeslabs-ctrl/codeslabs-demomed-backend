# Script de despliegue para backend - Windows PowerShell

param(
    [string]$Host = $env:DEPLOY_HOST,
    [string]$User = $env:DEPLOY_USER,
    [string]$RemotePath = $env:DEPLOY_REMOTE_PATH,
    [int]$Port = 22,
    [string]$Method = "scp"
)

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "✅ $message"
}

function Write-Error-Custom($message) {
    Write-ColorOutput Red "❌ $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "ℹ️  $message"
}

function Write-Warning-Custom($message) {
    Write-ColorOutput Yellow "⚠️  $message"
}

# Verificar valores por defecto
if (-not $Host) { $Host = "tu-servidor.com" }
if (-not $User) { $User = "usuario" }
if (-not $RemotePath) { $RemotePath = "/var/www/femimed-backend" }

Write-Info "Iniciando despliegue del backend..."
Write-Info "Servidor: ${User}@${Host}:${Port}"
Write-Info "Ruta remota: $RemotePath"
Write-Info "Método: $Method"

# Verificar que existe el directorio dist
$distPath = Join-Path $PSScriptRoot "..\dist"
if (-not (Test-Path $distPath)) {
    Write-Error-Custom "No se encontró el directorio dist"
    Write-Info "Ejecuta primero: npm run build"
    exit 1
}

function Deploy-SCP {
    Write-Info "Desplegando con SCP..."
    
    $scpAvailable = Get-Command scp -ErrorAction SilentlyContinue
    
    if (-not $scpAvailable) {
        Write-Error-Custom "SCP no está disponible. Instala OpenSSH."
        exit 1
    }
    
    try {
        # Crear directorio temporal
        $tempDir = Join-Path $PSScriptRoot "..\.deploy-temp"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        
        Write-Info "Preparando archivos..."
        
        # Copiar dist
        Copy-Item -Path "$distPath\*" -Destination "$tempDir\dist\" -Recurse -Force
        
        # Copiar assets si existe
        $assetsPath = Join-Path $PSScriptRoot "..\assets"
        if (Test-Path $assetsPath) {
            Copy-Item -Path "$assetsPath\*" -Destination "$tempDir\assets\" -Recurse -Force
        }
        
        # Copiar package.json
        $packageJson = Join-Path $PSScriptRoot "..\package.json"
        Copy-Item -Path $packageJson -Destination $tempDir
        
        # Enviar archivos
        Write-Info "Enviando archivos al servidor..."
        $scpCommand = "scp -r -P $Port `"$tempDir\*`" ${User}@${Host}:${RemotePath}/"
        Invoke-Expression $scpCommand
        
        # Limpiar
        Remove-Item $tempDir -Recurse -Force
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Despliegue completado con SCP"
            Write-Info "`n📋 Próximos pasos en el servidor:"
            Write-Info "1. cd $RemotePath"
            Write-Info "2. npm install --production"
            Write-Info "3. Reiniciar el servicio"
        } else {
            Write-Error-Custom "Error en el despliegue"
            exit 1
        }
    } catch {
        Write-Error-Custom "Error: $_"
        exit 1
    }
}

switch ($Method.ToLower()) {
    "scp" {
        Deploy-SCP
    }
    default {
        Write-Error-Custom "Método no soportado: $Method"
        exit 1
    }
}

Write-Success "🎉 Despliegue completado!"


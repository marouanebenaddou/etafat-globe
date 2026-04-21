# ETAFAT Globe — Windows installer
#
# What this does (in order):
#   1. Fetches the RTKLIB 2.4.3 b34 Windows binaries (rnx2rtkp.exe + convbin.exe)
#      from the official tomojitakasu/RTKLIB release and drops them into
#      backend\rtklib_bin\.
#   2. Creates a Python virtualenv in backend\.venv and installs the pinned
#      requirements there — no global pip changes.
#   3. Installs Node.js dependencies for the Next.js frontend via npm.
#   4. Runs the validation tests against the CHC reference dataset so you
#      know the engine is working before you open the UI.
#
# Re-running the script is safe: it skips steps that are already done.

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$Backend     = Join-Path $ProjectRoot "backend"
$RtkBin      = Join-Path $Backend     "rtklib_bin"
$Venv        = Join-Path $Backend     ".venv"

function Write-Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    [OK] $msg"    -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "    [!]  $msg"    -ForegroundColor Yellow }
function Write-Fail($msg)  { Write-Host "    [X]  $msg"    -ForegroundColor Red; exit 1 }


# ─── 0. sanity checks ───────────────────────────────────────────────────────
Write-Step "Vérification des prérequis"

foreach ($cmd in @("git", "python", "node", "npm")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Fail "$cmd introuvable — voir WINDOWS_SETUP.md section 1"
    }
}
Write-Ok "git / python / node / npm disponibles"

$pyVersion = (python --version) -replace "Python ", ""
Write-Ok "Python $pyVersion"


# ─── 1. RTKLIB binaries ─────────────────────────────────────────────────────
Write-Step "Installation des binaires RTKLIB (rnx2rtkp, convbin)"

if (-not (Test-Path $RtkBin)) { New-Item -ItemType Directory -Path $RtkBin | Out-Null }

$rnx2rtkp = Join-Path $RtkBin "rnx2rtkp.exe"
$convbin  = Join-Path $RtkBin "convbin.exe"

if ((Test-Path $rnx2rtkp) -and (Test-Path $convbin)) {
    Write-Ok "Binaires déjà présents"
} else {
    # The official RTKLIB repo ships pre-built Windows binaries in /bin.
    # We fetch just those two files via GitHub's raw content CDN.
    $base = "https://raw.githubusercontent.com/tomojitakasu/RTKLIB_bin/master/bin"

    foreach ($pair in @(
        @("rnx2rtkp.exe", $rnx2rtkp),
        @("convbin.exe",  $convbin)
    )) {
        $name, $dest = $pair
        Write-Host "    Téléchargement $name ..."
        try {
            Invoke-WebRequest -Uri "$base/$name" -OutFile $dest -UseBasicParsing
        } catch {
            Write-Fail "Téléchargement échoué : $($_.Exception.Message)"
        }
    }
    Write-Ok "rnx2rtkp.exe + convbin.exe installés dans backend\rtklib_bin\"
}


# ─── 2. Python virtualenv + deps ────────────────────────────────────────────
Write-Step "Environnement Python (backend)"

if (-not (Test-Path $Venv)) {
    python -m venv $Venv
    Write-Ok ".venv créé"
} else {
    Write-Ok ".venv déjà présent"
}

$pip = Join-Path $Venv "Scripts\pip.exe"
$py  = Join-Path $Venv "Scripts\python.exe"

& $pip install --quiet --upgrade pip
& $pip install --quiet -r (Join-Path $Backend "requirements.txt")
Write-Ok "Dépendances Python installées (fastapi, numpy, scipy, uvicorn...)"


# ─── 3. Node dependencies ───────────────────────────────────────────────────
Write-Step "Dépendances Node.js (frontend)"

Push-Location $ProjectRoot
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Ok "node_modules installé"
} else {
    Write-Ok "node_modules déjà présent"
}
Pop-Location


# ─── 4. Validation ──────────────────────────────────────────────────────────
Write-Step "Test de validation du moteur d'ajustement"

Push-Location $Backend
try {
    & $py "tests\test_adjustment.py"
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Tests passés — le moteur reproduit les résultats CHC"
    } else {
        Write-Warn "Les tests ont signalé un écart (voir sortie ci-dessus)"
    }
} catch {
    Write-Warn "Impossible de lancer les tests : $($_.Exception.Message)"
}
Pop-Location


# ─── 5. Next steps ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Installation terminée." -ForegroundColor Green
Write-Host ""
Write-Host "Pour lancer l'outil (deux fenêtres PowerShell) :" -ForegroundColor White
Write-Host ""
Write-Host "  Fenêtre 1 (backend)  :" -ForegroundColor Gray
Write-Host "    cd backend"
Write-Host "    .\.venv\Scripts\Activate.ps1"
Write-Host "    uvicorn app:app --port 8000"
Write-Host ""
Write-Host "  Fenêtre 2 (frontend) :" -ForegroundColor Gray
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Puis ouvrir : http://localhost:3000/tools/gnss" -ForegroundColor White
Write-Host ""

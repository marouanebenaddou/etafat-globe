# ETAFAT Globe — Installation Windows

Ce guide explique comment lancer **l'outil complet** (interface web + moteur
de calcul GNSS) sur une machine Windows 10 / 11.

**Durée** : 10–15 minutes si vous n'avez jamais installé Python/Node.
**Résultat** : vous ouvrez `http://localhost:3000/tools/gnss` dans votre
navigateur et vous pouvez lancer des calculs qui passent par le vrai moteur
Python (pas le mode démo).

---

## 1. Prérequis à installer une seule fois

Télécharger et installer, dans l'ordre :

1. **Git** — <https://git-scm.com/download/win>
   Lors de l'installation, laisser toutes les options par défaut.

2. **Python 3.11 ou 3.12** — <https://www.python.org/downloads/windows/>
   **Important** : cocher ✅ *"Add Python to PATH"* à la première étape de
   l'installateur.

3. **Node.js LTS** (version 20.x) — <https://nodejs.org/>
   Laisser les options par défaut.

Vérifier que tout marche en ouvrant un **PowerShell** (clic droit sur le
bureau → *Ouvrir dans le Terminal*) et en tapant :

```powershell
git --version
python --version
node --version
```

Chaque commande doit afficher un numéro de version. Si l'une dit *"commande
introuvable"*, relancer l'installateur en cochant la case PATH.

---

## 2. Récupérer le projet

Dans PowerShell, à l'endroit où vous voulez stocker le projet :

```powershell
cd $HOME\Documents
git clone https://github.com/marouanebenaddou/etafat-globe.git
cd etafat-globe
```

---

## 3. Installation automatique

Un script PowerShell installe tout le reste (RTKLIB, dépendances Python,
dépendances Node) en une commande :

```powershell
.\setup-windows.ps1
```

Si PowerShell bloque l'exécution avec un message de sécurité, lancer au
préalable :

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

puis réessayer.

Le script :

- Télécharge les binaires Windows de RTKLIB (~3 Mo) dans `backend\rtklib_bin\`
- Crée un environnement Python isolé dans `backend\.venv`
- Installe `fastapi`, `numpy`, `scipy`, `uvicorn` dans cet environnement
- Installe les dépendances Node.js pour le frontend
- Lance les tests de validation (doit afficher ✓ à la fin)

---

## 4. Lancer l'outil

**Ouvrir DEUX fenêtres PowerShell côte à côte** dans le dossier `etafat-globe`.

### Fenêtre 1 — backend (moteur de calcul)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app:app --port 8000
```

Vous devez voir `Uvicorn running on http://127.0.0.1:8000`. **Laisser cette
fenêtre ouverte** pendant que vous utilisez l'outil.

### Fenêtre 2 — frontend (site web)

```powershell
npm run dev
```

Vous devez voir `Ready - local: http://localhost:3000`.

Ouvrir le navigateur sur **<http://localhost:3000/tools/gnss>**.

---

## 5. Vérifier que le moteur est connecté

En haut de la page, à droite, le badge doit afficher **"Moteur en ligne"**
(vert). Si ça affiche "Mode démo" (orange), le backend n'est pas lancé —
revenir à l'étape 4, fenêtre 1.

Pour tester immédiatement :

1. Cliquer sur **"Charger le jeu de test (24/12/2025)"** dans la carte
   "Vecteurs de lignes de base" — 22 baselines se chargent automatiquement.
2. Cliquer sur **"Lancer le calcul"**. Le badge au-dessus du bouton doit
   indiquer "MOTEUR RÉEL".
3. Les résultats s'affichent avec σ₀, χ², précisions H/V — calculés par
   le vrai moteur Python.

---

## 6. Arrêter l'outil

- Dans chaque fenêtre PowerShell : `Ctrl + C` puis confirmer.

---

## Problèmes courants

**"python : le terme … n'est pas reconnu"**
L'installation Python n'a pas mis `python.exe` dans le PATH. Réinstaller
en cochant *"Add Python to PATH"*, ou ajouter manuellement le dossier
`C:\Users\VOUS\AppData\Local\Programs\Python\Python311\` au PATH.

**"uvicorn : le terme … n'est pas reconnu"**
Le virtualenv n'est pas activé. Relancer `.\.venv\Scripts\Activate.ps1`
dans la fenêtre backend — vous devez voir `(.venv)` apparaître au début
de la ligne.

**Le badge reste sur "Mode démo" même avec le backend lancé**
Ouvrir <http://localhost:8000/health> dans le navigateur. Si la page
charge, c'est un souci de CORS — vérifier qu'aucun autre service ne
tourne sur le port 8000. Sinon, relancer le backend.

**"Get-ExecutionPolicy : accès refusé"**
Vous n'avez pas les droits admin. Utiliser PowerShell en mode
administrateur (clic droit → *Exécuter en tant qu'administrateur*).

---

## Utilisation quotidienne

Une fois tout installé, les seules étapes récurrentes sont :

1. Ouvrir deux PowerShell dans `etafat-globe`
2. Fenêtre 1 : `cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app:app --port 8000`
3. Fenêtre 2 : `npm run dev`
4. Navigateur : <http://localhost:3000/tools/gnss>

Pour récupérer les mises à jour du code :

```powershell
cd $HOME\Documents\etafat-globe
git pull
```

Si le `git pull` modifie `backend\requirements.txt` :

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Si ça modifie `package.json` :

```powershell
npm install
```

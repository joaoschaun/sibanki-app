cd /d C:\Users\jscha\virtus-financeiro
git add "public/app/app.js"
git commit -m "fix: usuario nao logado em /app mostra login diretamente, sem redirect loop"
firebase deploy --only hosting:staging
firebase deploy --only hosting:app

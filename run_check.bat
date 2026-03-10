cd /d C:\Users\jscha\virtus-financeiro
git show HEAD:public/app/index.html > _tmp_check.html
node check2.js
del _tmp_check.html
del check2.js

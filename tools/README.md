# Banc de simulation d'équilibrage

`balance-sim.js` joue le jeu à la place d'un joueur, en accéléré (horloge truquée, boucle `update()` sans rendu).
Il achète à l'atelier, tire/équipe/fait évoluer des cartes, débloque des armes, active les pouvoirs, choisit les perks,
accepte le revive et lance des recherches au labo.

Usage (dans le navigateur, jeu servi par `python -m http.server 8765`) :

```js
var src = await fetch('/tools/balance-sim.js').then(r => r.text());
(0, eval)(src);
TDSIM.newState('regular');   // casual | regular | engaged
runAsync(30);                // simuler 30 jours en tâche de fond (voir prog())
```

Hors de l'application : jamais copié dans `android/app/src/main/assets`.

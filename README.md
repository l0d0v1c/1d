# Page de présentation de 1dea

Un site statique : aucune dépendance, aucune étape de construction. Les trois
fichiers se servent tels quels.

    index.html    le contenu, français et anglais dans le même document
    styles.css    la mise en forme
    app.js        la bascule de langue et la constellation du héros
    img/          les captures, en deux langues, et les icônes

## Voir la page

    python3 -m http.server -d web 8000

puis <http://localhost:8000/>. Ouvrir `index.html` directement fonctionne
aussi, à ceci près que le choix de langue n'est pas retenu d'une visite à
l'autre (le stockage local est refusé aux URL `file://`).

## Les deux langues

Les deux versions vivent dans le même document : chaque élément porte un
attribut `lang`, et une règle CSS masque celle qui n'est pas demandée. Le texte
reste donc lisible et modifiable dans le HTML, sans dictionnaire JavaScript à
tenir à jour.

La page s'ouvre en anglais. La langue affichée suit, dans cet ordre : le
paramètre `?lang=fr` ou `?lang=en` de l'URL — pratique pour partager un lien
vers une version précise —, puis le choix déjà fait par le visiteur, et à
défaut l'anglais. La langue du navigateur n'entre pas en compte.

## Les captures

Elles sont produites par `medias/screenshots/capture.sh`, qui a besoin des
arguments de lancement de DEBUG retirés dans `c45e121` : faire `git revert
c45e121` avant de relancer une campagne. Les fichiers attendus ici sont nommés
`<langue>-<écran>.png`, et `<langue>-map.jpg` pour la carte — seule image de
terrain du lot, que le PNG ne sait pas compresser.

## Mettre en ligne

Le dossier se publie tel quel sur GitHub Pages, Netlify ou tout hébergement de
fichiers statiques. Aucune configuration de serveur n'est nécessaire.

## Rien ne bouge

Aucune animation : pas de transition, pas de défilement adouci, pas de boucle
de rendu. La constellation du héros est calculée d'un trait au chargement —
c'est le placement ressorts-charges du graphe de l'application — puis dessinée
une seule fois.

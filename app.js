/*
  1dea — page de présentation
  ---------------------------------------------------------------------------
  Deux choses seulement : la bascule de langue, et la constellation du héros.
*/

(function () {
    'use strict';

    /* ------------------------------------------------------------- langue */

    var root = document.documentElement;
    var buttons = document.querySelectorAll('[data-setlang]');

    function stored() {
        try { return localStorage.getItem('1dea-lang'); } catch (e) { return null; }
    }

    function remember(lang) {
        try { localStorage.setItem('1dea-lang', lang); } catch (e) { /* mode privé */ }
    }

    function setLanguage(lang, persist) {
        root.setAttribute('data-lang', lang);
        root.setAttribute('lang', lang);

        buttons.forEach(function (button) {
            button.setAttribute('aria-pressed',
                button.dataset.setlang === lang ? 'true' : 'false');
        });

        // Les captures existent dans les deux langues : on échange la source
        // plutôt que d'en charger deux et d'en cacher une.
        document.querySelectorAll('[data-shot]').forEach(function (img) {
            var name = img.dataset.shot;
            // La carte est en JPEG, elle seule : c'est une image de terrain,
            // que le PNG ne sait pas compresser.
            var ext = name === 'map' ? 'jpg' : 'png';
            img.src = 'img/' + lang + '-' + name + '.' + ext;
        });

        // Le visiteur anglophone doit atterrir sur sa propre boutique.
        document.querySelectorAll('[data-href-' + lang + ']').forEach(function (a) {
            a.href = a.dataset['href' + lang.charAt(0).toUpperCase() + lang.slice(1)];
        });

        if (persist) { remember(lang); }
    }

    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
            setLanguage(button.dataset.setlang, true);
        });
    });

    // Ordre : ce que l'URL demande — pour partager un lien vers une version
    // précise —, puis le choix déjà fait par le visiteur, et à défaut
    // l'anglais. La langue du navigateur n'entre pas en compte : le document
    // s'ouvre en anglais, le bouton est là pour le français.
    var asked = null;
    try {
        asked = new URLSearchParams(window.location.search).get('lang');
    } catch (e) { /* navigateur ancien */ }

    var initial = (asked === 'fr' || asked === 'en') ? asked : (stored() || 'en');
    setLanguage(initial, asked !== null);

    /* ------------------------------------------------------ constellation */

    /*
      Le même placement ressorts-charges que le graphe de l'application : les
      points se repoussent tous, les arêtes les rappellent, une vitesse amortie
      évite le frémissement d'un pas de longueur imposée, et la température
      décroît jusqu'à l'arrêt.

      La mise en place est déroulée d'un trait, sans être peinte : la page
      n'affiche que la figure posée. Rien ne bouge, rien ne clignote, et aucune
      boucle d'animation ne tourne derrière.
    */

    var canvas = document.getElementById('constellation');
    if (!canvas) { return; }
    var ctx = canvas.getContext('2d');

    // La palette des catégories de l'app, à l'hexadécimal près.
    var COLOURS = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE'];
    var COUNT = 46;
    var DAMPING = 0.82;
    var GAIN = 0.0025;
    var COOLING = 0.975;
    var FREEZING = 0.0004;
    var GRAVITY = 1.0;

    var nodes = [];
    var links = [];
    var temperature = 0;
    var ideal = Math.sqrt(1 / COUNT);
    var width = 0;
    var height = 0;
    var ratio = 1;

    // Générateur déterministe : la figure est la même à chaque visite, elle
    // fait partie de l'identité de la page et non d'un tirage au sort.
    var seed = 20260930;
    function random() {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    }

    function build() {
        nodes = [];
        links = [];

        var golden = Math.PI * (3 - Math.sqrt(5));
        for (var i = 0; i < COUNT; i++) {
            var radius = Math.sqrt(i / (COUNT - 1));
            var angle = golden * i;
            nodes.push({
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle),
                vx: 0,
                vy: 0,
                degree: 0,
                colour: COLOURS[Math.floor(random() * COLOURS.length)]
            });
        }

        // Quelques grappes, plus une poignée de liens posés à la main : c'est
        // ce que donne un vrai corpus, des groupes et quelques ponts.
        var clusters = 5;
        for (var n = 0; n < COUNT; n++) {
            var group = Math.floor(n / (COUNT / clusters));
            for (var m = n + 1; m < COUNT; m++) {
                var other = Math.floor(m / (COUNT / clusters));
                var near = group === other && random() < 0.28;
                var bridge = group !== other && random() < 0.012;
                if (near || bridge) {
                    links.push({ a: n, b: m, explicit: bridge });
                    nodes[n].degree++;
                    nodes[m].degree++;
                }
            }
        }

        temperature = 0.09;
    }

    function step() {
        var i, j;
        var fx = new Float64Array(COUNT);
        var fy = new Float64Array(COUNT);
        var k = ideal;

        for (i = 0; i < COUNT; i++) {
            for (j = i + 1; j < COUNT; j++) {
                var dx = nodes[i].x - nodes[j].x;
                var dy = nodes[i].y - nodes[j].y;
                var squared = dx * dx + dy * dy;
                if (squared < 1e-12) { dx = 1e-5; dy = -1e-5; squared = 2e-10; }
                var distance = Math.sqrt(squared);
                var force = k * k / distance;
                var ux = dx / distance * force;
                var uy = dy / distance * force;
                fx[i] += ux; fy[i] += uy;
                fx[j] -= ux; fy[j] -= uy;
            }
        }

        for (i = 0; i < links.length; i++) {
            var a = links[i].a, b = links[i].b;
            var ex = nodes[a].x - nodes[b].x;
            var ey = nodes[a].y - nodes[b].y;
            var d = Math.max(Math.sqrt(ex * ex + ey * ey), 1e-6);
            var weight = links[i].explicit ? 1.6 : 0.5;
            var pull = d * d / k * weight;
            fx[a] -= ex / d * pull; fy[a] -= ey / d * pull;
            fx[b] += ex / d * pull; fy[b] += ey / d * pull;
        }

        for (i = 0; i < COUNT; i++) {
            fx[i] -= nodes[i].x * GRAVITY;
            fy[i] -= nodes[i].y * GRAVITY;

            nodes[i].vx = (nodes[i].vx + fx[i] * GAIN) * DAMPING;
            nodes[i].vy = (nodes[i].vy + fy[i] * GAIN) * DAMPING;

            var speed = Math.sqrt(nodes[i].vx * nodes[i].vx + nodes[i].vy * nodes[i].vy);
            if (speed > temperature) {
                nodes[i].vx *= temperature / speed;
                nodes[i].vy *= temperature / speed;
            }

            nodes[i].x += nodes[i].vx;
            nodes[i].y += nodes[i].vy;
        }

        temperature *= COOLING;
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        // `resize` peint dès le premier appel, avant que la figure n'existe.
        if (!nodes.length) { return; }

        // Cadrage sur le nuage réellement obtenu, comme le bouton de recadrage
        // de l'application.
        var reachX = 0.2;
        var reachY = 0.2;
        for (var n = 0; n < COUNT; n++) {
            reachX = Math.max(reachX, Math.abs(nodes[n].x));
            reachY = Math.max(reachY, Math.abs(nodes[n].y));
        }
        // Le placement reste circulaire, comme dans l'application ; seul le
        // report à l'écran est étiré, pour que la figure occupe la bande au
        // lieu de flotter au centre d'un rectangle trois fois plus large
        // qu'elle. Les points, eux, restent ronds.
        var stretch = Math.min(Math.max(width / Math.max(height, 1), 1), 2.4);
        var scale = Math.min(width * 0.46 / (reachX * stretch), height * 0.44 / reachY);
        var scaleX = scale * stretch;
        var cx = width / 2;
        var cy = height / 2;

        for (var i = 0; i < links.length; i++) {
            var a = nodes[links[i].a];
            var b = nodes[links[i].b];
            ctx.beginPath();
            ctx.moveTo(cx + a.x * scaleX, cy + a.y * scale);
            ctx.lineTo(cx + b.x * scaleX, cy + b.y * scale);
            if (links[i].explicit) {
                ctx.setLineDash([]);
                ctx.strokeStyle = 'rgba(0, 122, 255, 0.85)';
                ctx.lineWidth = 1.4;
            } else {
                ctx.setLineDash([3, 4]);
                ctx.strokeStyle = 'rgba(174, 195, 219, 0.28)';
                ctx.lineWidth = 1;
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);

        for (var m = 0; m < COUNT; m++) {
            // L'aire dit le nombre de liens, comme dans l'application.
            var size = 2.6 + 2.2 * Math.sqrt(nodes[m].degree);
            ctx.beginPath();
            ctx.arc(cx + nodes[m].x * scaleX, cy + nodes[m].y * scale, size, 0, Math.PI * 2);
            ctx.fillStyle = nodes[m].colour;
            ctx.fill();
        }
    }

    // Déroule la mise en place jusqu'à l'arrêt, sans rien peindre. Le garde-fou
    // borne la boucle : mieux vaut une figure imparfaite qu'un onglet figé si
    // un réglage venait à empêcher le refroidissement.
    function settle() {
        var guard = 0;
        while (temperature >= FREEZING && guard < 2000) {
            step();
            guard++;
        }
    }

    function resize() {
        ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw();
    }

    // Un redimensionnement ne refait que le cadrage : la figure est acquise.
    window.addEventListener('resize', function () {
        clearTimeout(resize.pending);
        resize.pending = setTimeout(resize, 150);
    });

    // La figure est construite et posée avant le premier dessin : `resize`
    // peint, et peindre un tableau vide faisait tomber tout le script.
    build();
    settle();
    resize();

})();

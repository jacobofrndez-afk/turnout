window.I18N_FR = {
  ui: {
    docTitle: "Parcours commerçant",
    headline: "Du premier clic à la campagne publiée",
    intro: "Dix étapes, un seul bar. Chaque étape montre l'écran du produit, ce qui la déclenche, les services externes appelés, ce que ces appels décident et où en est le travail. Le bar : Penn & Pour, à deux rues du Madison Square Garden, avec cinq offres. Le soir : Harry Styles au Garden.",
    views: { journey: "Parcours", work: "Chantiers", calls: "Budget d'appels" },
    phases: { arrive: "Premiers pas", night: "Soir d'événement", week: "Chaque semaine", loop: "Boucler la boucle" },
    stepOf: "Étape {n} sur {total}",
    prev: "Précédent",
    next: "Suivant",
    hint: "Cliquez sur le bouton en surbrillance, ou utilisez les flèches du clavier.",
    realShot: "Écran réel, capturé dans l'app en fonctionnement. Faites défiler à l'intérieur.",
    fullscreen: "Plein écran",
    exitFullscreen: "Quitter le plein écran",
    discovery: {
      title: "Comment le commerçant apprend qu'une foule arrive",
      today: "Aujourd'hui, en pull : il doit ouvrir le radar pour la voir.",
      target: "Objectif, en push : Turnout le prévient, avec la campagne déjà rédigée. Le radar sert alors à aller plus loin, ce n'est plus la porte d'entrée."
    },
    screensNote: "Les écrans sont en anglais, comme le produit.",
    hood: "Sous le capot",
    trigger: "Ce qui la déclenche",
    sees: "Ce que voit le commerçant",
    calls: "Appels externes",
    decides: "Ce qui est décidé",
    code: "Dans le code",
    nextUp: "À suivre",
    noCalls: "Aucun appel externe.",
    status: { done: "Construit", wip: "En cours", todo: "À construire" },
    trig: { pull: "Pull", push: "Push" },
    legend: { pull: "lancé par le commerçant", push: "lancé à heure fixe ou quand une foule dépasse un seuil", qloo: "un appel à Qloo" },
    svc: { storefront: "Vitrine", screen: "Écran" },
    now: [
      { k: "Aujourd'hui", v: "Le commerçant lance tout", d: "Rien ne se passe tant qu'il ne clique pas." },
      { k: "Objectif pour le jury", v: "Alerte automatique pour les grosses foules", d: "Quand une grosse foule arrive, la campagne est rédigée avant que le commerçant ouvre l'app. Un seul geste pour la valider." },
      { k: "Appels Qloo par foule", v: "5 + 1 par offre", d: "10 appels pour Penn & Pour, gardés 7 jours en cache. Un match à la télé en ajoute 2 (marque de l'équipe, ferveur locale), un thème de rue jusqu'à 3." },
      { k: "Ce qui compte comme une foule", v: "À l'échelle du commerce", d: "Un moment qui vaut un quart de vos places : un stade, la sortie des théâtres de Broadway, les Knicks à la télé, un défilé, la nuit d'Halloween." }
    ],
    work: {
      title: "Chantiers",
      intro: "Qui s'occupe de quoi, et quelles étapes du parcours en dépendent. Mis à jour au fil de l'avancement.",
      cols: ["Chantier", "Responsable", "État", "Étapes"],
      rows: [
        { item: "Connecter les comptes Twilio et Snapchat Ads", who: "Jacobo", status: "wip", steps: ["8"] },
        { item: "Mettre le serveur en ligne sur Railway avec la clé Anthropic, avant le 24 octobre", who: "Jacobo", status: "todo", steps: ["7", "8"] },
        { item: "Logo Swing, graisse S1 et palette de couleurs", who: "Design", status: "wip", label: "En attente du choix de Jacobo", steps: ["1"] },
        { item: "Page d'accueil qui met en avant ce que le bar y gagne", who: "Marketing", status: "done", steps: ["1"] },
        { item: "Push : le planificateur et l'alerte au commerçant", who: "Backend", status: "todo", steps: ["5", "9"] },
        { item: "Enregistrer chaque profil de foule une seule fois, au lieu de le recalculer", who: "Backend", status: "todo", steps: ["6", "7"] },
        { item: "Un code par campagne pour compter qui est venu", who: "Pas encore attribué", status: "todo", steps: ["10"] }
      ]
    },
    budget: {
      title: "Appels par moment",
      intro: "Combien d'appels externes chaque moment déclenche, pour un bar avec cinq offres.",
      cols: ["Moment", "Qloo", "Ticketmaster", "Open-Meteo", "Claude"],
      rows: [
        ["Inscription, une seule fois", "10", "0", "0", "0"],
        ["Radar, par bar et par heure", "2 par équipe à la télé", "1", "1 par moment fort", "0"],
        ["Une foule et sa campagne", "10", "0", "1", "1"],
        ["Pouls du quartier, chaque semaine", "8", "0", "1", "1"]
      ],
      note: "Un deuxième bar près de la même salle réutilise les appels sur la foule, gardés 7 jours en cache. Seuls les appels liés à ses propres offres s'ajoutent. Le radar appelle aussi ESPN (un appel par ligue et par jour) et les données ouvertes de la ville (un par repérage), gardés 3 h ; les appels Qloo sur la marque de l'équipe et la ferveur locale sont gardés 7 jours.",
      unusedTitle: "Appels Qloo testés puis écartés",
      unused: [
        ["GET /entities", "Retrouve une entité à partir de son identifiant Qloo, Spotify, Resy ou Michelin. /search couvre déjà ce dont nous avons besoin."],
        ["GET /v2/trending", "Tendances de la semaine. Courbes plates pour toutes les entités testées."],
        ["GET /v2/analysis/compare", "Renvoie deux listes de tags sans mesurer l'écart entre elles. Deux appels démographiques en disent plus."],
        ["GET /v2/audiences", "Segments d'audience prédéfinis. Utile pour une marque, mais un bar part de la tête d'affiche du soir, pas d'un segment."],
        ["qloo mcp", "Les neuf scénarios du kit du hackathon. Pratiques pour tester, mais aucun ne cherche autour d'un point dans un rayon donné."]
      ]
    },
    footer: "Source : docs/journey dans le dépôt Turnout, republié à ce lien au fil de l'avancement. Qloo décrit ce que les groupes aiment, jamais une personne. Aucune donnée personnelle n'est envoyée à Qloo."
  },
  steps: {
    s1: {
      title: "Découvrir Turnout",
      who: "le commerçant arrive sur la page d'accueil",
      sees: "La promesse du produit, et un encart en direct : la prochaine grande foule près d'un bar de Midtown.",
      decides: "Rien encore. L'encart prouve que Turnout repère une vraie foule cette semaine.",
      calls: [{ what: "les événements à venir autour de Penn & Pour, pour l'encart en direct", count: "1 · en cache 1 h" }]
    },
    s2: {
      title: "S'inscrire en deux minutes",
      who: "le commerçant remplit un court formulaire",
      sees: "Le nom, le type d'établissement, l'adresse, les offres en mots simples (une par ligne), le ton souhaité et les canaux dont le bar dispose déjà.",
      decides: "Le centre du radar, et le rayon de 1,5 km qu'il surveille.",
      calls: [{ what: "convertit l'adresse en coordonnées GPS et en fuseau horaire", count: "1" }]
    },
    s3: {
      title: "Vérifier ce que Turnout a compris",
      who: "le commerçant garde les bons tags",
      sees: "Chaque offre traduite en tags Qloo : « Happy hour cocktails 5 to 7 » devient Cocktail Bar et Happy hour. Le commerçant décoche ce qui ne va pas.",
      decides: "Les identifiants des tags Qloo derrière chaque offre. Turnout les réutilise pour chaque foule et chaque semaine, sans jamais les redemander.",
      calls: [{ what: "trouve le tag Qloo d'une expression, une par appel", count: "1 à 3 par offre · 10 ici" }]
    },
    s4: {
      title: "Le radar repère la foule",
      who: "le commerçant ouvre le radar",
      sees: "Une frise des trois prochains jours qui montre combien de personnes seront autour du bar, avec chaque moment, et une carte. On fait glisser la frise pour voir qui est là à tout instant, on tire le cercle pour agrandir le rayon. Cinq sortes de foules : un spectacle dans une salle (Harry Styles au Garden, 20 000 personnes, à 300 m), plusieurs petits spectacles qui commencent ou finissent en même temps (31 spectacles de Broadway à 22 h 30, 32 000 personnes), l'équipe locale à la télé (Knicks à Boston vendredi), un événement de rue (un défilé, une fête de quartier) et une nuit de la ville (Halloween).",
      decides: "Les moments qui valent une campagne, à l'échelle du commerce : un moment capable de remplir un quart de la salle. Soixante-dix places, c'est dix-huit clients, donc un match des Rangers un mardi compte, pas seulement un stade. Pour les matchs à la télé, Qloo mesure à quel point les rues autour du bar aiment l'équipe : les Knicks autour de Penn & Pour, 0,99, un public à domicile.",
      next: "Lancer le même repérage toutes les heures pour chaque bar, sans aucun clic. C'est l'étape 5.",
      calls: [
        { what: "les événements à moins de 4,5 km, hors visites de salle et billets annexes", count: "1 · en cache 1 h" },
        { what: "les matchs des équipes locales, ligue par ligue et jour par jour", count: "4 ligues × 5 jours · en cache 3 h" },
        { what: "les événements de rue autorisés (défilés, fêtes de quartier, courses) autour du bar", count: "1 · en cache 3 h" },
        { what: "associe chaque équipe à sa marque Qloo", count: "1 par équipe · en cache 7 jours" },
        { what: "à quel point les rues autour du bar aiment l'équipe (carte de chaleur Qloo, médiane à moins de 800 m)", count: "1 par équipe · en cache 7 jours" },
        { what: "la météo heure par heure au bar, pour chaque moment qui vaut une campagne", count: "1 par moment · en cache 1 h" }
      ]
    },
    s5: {
      title: "Recevoir l'alerte, campagne déjà prête",
      who: "le repérage horaire trouve une foule au-dessus du seuil",
      sees: "Un message WhatsApp : Harry Styles joue au Garden mercredi, environ 20 000 personnes à 300 m, et la campagne est prête. Un bouton pour la relire, un autre pour la valider.",
      decides: "Le moment où le commerçant apprend qu'une foule arrive. Plus il le sait tôt, plus la campagne peut tourner longtemps.",
      codeNote: "Il faut un planificateur sur le serveur, pas encore construit. Les étapes 4, 6 et 7 marchent déjà : le planificateur n'a qu'à les lancer.",
      next: "Construire le planificateur et l'alerte WhatsApp.",
      calls: [
        { what: "le repérage de l'étape 4, toutes les heures, pour chaque bar", count: "1 par bar et par heure" },
        { what: "les étapes 6 et 7, lancées avant que le commerçant ouvre l'app", count: "comme aux étapes 6 et 7" },
        { what: "l'alerte au commerçant", count: "1" }
      ]
    },
    s6: {
      title: "Qui vient, et quelle offre leur convient",
      who: "le commerçant ouvre une foule depuis le radar",
      sees: "Qui compose la foule, ce qu'elle aime, les bars voisins qu'elle fréquente déjà, et les offres du commerçant classées pour elle. Pour Harry Styles : des femmes de 25 à 29 ans, des bars à cocktails sur les toits, Gucci et Dior. Pour la sortie des théâtres de Broadway : Schmigadoon!, Aladdin et Le Roi Lion lus à travers leurs versions à l'écran, plus le tag Musical Theatre, un public jeune et féminin. Pour les Knicks à la télé : des hommes de 30 à 34 ans, et l'offre grand écran l'emporte à 0,98.",
      decides: "Qui compose la foule, et le classement des offres pour elle. Un spectacle a une tête d'affiche ; un moment fait de plusieurs spectacles, d'une équipe ou d'un thème est lu par Qloo comme une seule foule. Si un nom est ambigu, c'est le commerçant qui choisit la bonne correspondance, jamais l'IA.",
      next: "Le profil est recalculé à chaque chargement de la page. Le cache le rend gratuit, mais il faudrait l'enregistrer une fois par foule.",
      calls: [
        { what: "associe le nom de la tête d'affiche à un identifiant Qloo ; pour un moment, les trois plus gros spectacles, l'équipe, ou les entités qui incarnent le thème", count: "1 à 4" },
        { what: "les tranches d'âge et le genre surreprésentés dans la foule", count: "1" },
        { what: "les tags de goût de la foule, pour les lieux uniquement", count: "1" },
        { what: "les bars à moins de 1,5 km que la foule aime déjà", count: "1" },
        { what: "les marques que cette foule aime plus que la moyenne", count: "1" },
        { what: "les lieux proches qui portent les tags de chaque offre, notés pour cette foule", count: "1 par offre · 5 ici" }
      ]
    },
    s7: {
      title: "L'agent rédige la campagne",
      who: "le commerçant clique sur « Draft the campaign »",
      sees: "L'offre retenue et pourquoi, chiffres Qloo à l'appui. Deux créneaux avec leur météo, les textes pour cinq canaux, et ce que les données ne montrent pas.",
      decides: "L'offre et les textes : pour Harry Styles, le happy hour cocktails l'emporte sur la formule pichet des soirs de match, qui avait pourtant le meilleur score brut. La météo ne change l'offre que si elle compte vraiment : s'il pleut après un match des Rangers, le pichet laisse la place à un burger chaud.",
      next: "Mettre la clé Anthropic sur le serveur en ligne pour que l'agent tourne seul devant le jury. En local, il tourne en mode opérateur.",
      calls: [
        { what: "relit le profil de la foule de l'étape 6", count: "0 nouveau · en cache" },
        { what: "la météo avant l'ouverture des portes et après le concert", count: "1 · en cache 1 h" },
        { what: "choisit l'offre et rédige les textes, en sortie structurée", count: "1" }
      ]
    },
    s8: {
      title: "Valider, et Turnout publie",
      who: "le commerçant clique sur « Approve and publish »",
      sees: "Une ligne par canal du bar, chacune avec son statut : envoyé, créé en pause, prêt, ou simulé avec le contenu exact qui serait envoyé.",
      decides: "Qui entend parler de l'offre : des inconnus autour de la salle grâce à la publicité, les gens qui cherchent un bar sur Google, les habitués sur WhatsApp et les passants devant la vitrine.",
      next: "Connecter les comptes Twilio et Snapchat Ads.",
      calls: [
        { what: "publicité autour de la salle, créée en pause, ciblée avec les centres d'intérêt Qloo", count: "actif une fois connecté" },
        { what: "message aux habitués qui ont accepté de le recevoir, via Twilio", count: "actif une fois connecté" },
        { what: "offre publiée sur la fiche Google du bar", count: "simulé" },
        { what: "texte de l'ardoise et une phrase pour l'équipe", count: "prêt à l'emploi" },
        { what: "publicité sur un écran extérieur près de la salle", count: "simulé" }
      ]
    },
    s9: {
      title: "Le pouls du quartier : la foule de tous les jours",
      who: "le commerçant ouvre le pouls du quartier. L'alerte automatique du lundi n'est pas encore construite",
      sees: "Qui passe devant le bar un jour ordinaire, ce que ces gens aiment, où ils vont déjà, la météo de chaque soirée et l'offre à mettre en avant. Nouveau : le rythme de la rue, lu dans les lieux que Qloo connaît autour de la porte. Pour Le Quai 12 : l'after-work du lundi au vendredi de 18 h à 20 h (les descriptions de Qloo elles-mêmes parlent d'after-work pour quatre lieux voisins, 14 bars sur 31 font un happy hour), les fins de soirée du vendredi et du samedi (9 lieux ouverts après 2 h contre 6 un soir ordinaire), le brunch du week-end.",
      decides: "L'offre par défaut de la semaine, et les créneaux où la pousser : l'ardoise pour le pic de l'after-work, la publicité permanente sur ces heures, le message aux habitués pour le week-end. Les soirs d'événement passent avant.",
      calls: [
        { what: "les tags de goût de la rue, à partir de l'emplacement du bar", count: "1" },
        { what: "les lieux autour de la porte avec leurs horaires, leurs tags et les descriptions de Qloo, agrégés en rythme de la rue", count: "1 · en cache 7 jours" },
        { what: "les marques et médias que la rue aime plus que la moyenne", count: "1" },
        { what: "les lieux concurrents que la rue aime déjà", count: "1" },
        { what: "les lieux proches qui portent les tags de chaque offre, notés pour la rue", count: "1 par offre · 5 ici" },
        { what: "la météo de chaque soirée de la semaine, de 17 h à 21 h", count: "1 · en cache 1 h" },
        { what: "rédige le plan de la semaine : ardoise, publication Google, message aux habitués, publicité permanente", count: "1, au clic" }
      ]
    },
    s10: {
      title: "Mesurer qui est venu",
      who: "l'équipe saisit un code au comptoir",
      sees: "Combien de clients chaque campagne a fait venir, et quelles foules rapportent le plus. Pour l'instant, ce n'est qu'un concept : les chiffres affichés sont des exemples.",
      decides: "Les offres à garder la semaine suivante, et pour quelles foules.",
      codeNote: "Pas construit. Ça renforce l'histoire de l'impact, mais la démo n'en a pas besoin.",
      next: "Décider si cela entre dans la démo.",
      calls: []
    }
  }
};

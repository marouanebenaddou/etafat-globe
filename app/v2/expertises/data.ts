export interface Expertise {
  slug: string
  title: string
  color: string
  heroImg: string
  tagline: string
  intro: string[]
  methods: string[]
  highlight: { stat: string; label: string; desc: string }
  references: { title: string; client: string; desc: string }[]
}

export const expertises: Expertise[] = [
  {
    slug: "topographie-foncier",
    title: "Topographie & Foncier",
    color: "#007BFF",
    heroImg: "https://etafat.ma/wp-content/uploads/2020/12/foncier-1.png",
    tagline: "Sécuriser chaque mètre carré de votre patrimoine.",
    intro: [
      "Depuis 1983, nos géomètres-experts sillonnent le territoire marocain pour réaliser des levés topographiques de haute précision. Bornes, limites, altimétries — chaque donnée que nous produisons est une certitude juridique et technique.",
      "Que ce soit pour sécuriser un titre foncier, délimiter une zone d'aménagement ou préparer un projet d'infrastructure, Etafat mobilise ses équipes terrain et ses instruments de dernière génération pour vous livrer des résultats fiables, traçables et conformes aux normes nationales.",
    ],
    methods: [
      "Levés terrestres de précision",
      "Bornage & délimitation cadastrale",
      "Division et morcellement parcellaire",
      "Implantation sur le terrain",
      "Nivellement altimétrique",
      "Constitution de dossiers fonciers",
      "Expertise et contentieux fonciers",
      "Relevés des réseaux enterrés",
    ],
    highlight: { stat: "±1 cm", label: "de précision", desc: "Nos levés topographiques atteignent une précision centimétrique grâce à nos stations totales robotisées et récepteurs GNSS RTK." },
    references: [
      { title: "Délimitation du domaine ferroviaire", client: "ONCF", desc: "Levé et bornage de 1 900 km de voie ferrée à l'échelle nationale." },
      { title: "Sécurisation foncière des zones industrielles", client: "Min. Équipement", desc: "Établissement des titres fonciers pour 14 zones industrielles au Maroc." },
      { title: "Plan de recollement du réseau routier", client: "ADM", desc: "Cartographie de l'emprise domaniale de 1 500 km d'autoroutes." },
    ],
  },
  {
    slug: "sig",
    title: "Systèmes d'Information Géographique",
    color: "#0057b8",
    heroImg: "https://etafat.ma/wp-content/uploads/2020/12/sig.png",
    tagline: "Transformer la donnée spatiale en outil de décision.",
    intro: [
      "La donnée géospatiale n'a de valeur que si elle est accessible, exploitable et partageable. Chez Etafat, nous concevons des plateformes SIG sur-mesure qui transforment vos masses de données en tableaux de bord opérationnels, en portails cartographiques et en outils de pilotage.",
      "De la structuration des bases de données à la mise en production d'un WebSIG, en passant par la formation de vos équipes, nous vous accompagnons sur tout le cycle de vie de votre système d'information géographique.",
    ],
    methods: [
      "Conception de bases de données spatiales",
      "Développement de portails WebSIG",
      "Tableaux de bord cartographiques",
      "Intégration SIG & ERP/GMAO",
      "Migration et normalisation de données",
      "Formation & transfert de compétences",
      "Audit et optimisation de SIG existants",
      "Applications mobiles de collecte terrain",
    ],
    highlight: { stat: "+500", label: "couches de données", desc: "Nos plateformes SIG centralisent et gèrent des centaines de couches thématiques pour une vision territoriale complète et cohérente." },
    references: [
      { title: "Système d'information foncier national", client: "ANCFCC", desc: "Développement d'un SIG national intégrant le cadastre et les titres fonciers du Maroc." },
      { title: "Portail cartographique énergétique", client: "MASEN", desc: "Plateforme SIG pour le suivi et la gestion des parcs d'énergies renouvelables." },
      { title: "WebSIG de gestion du réseau d'eau", client: "ONEE", desc: "Système de supervision cartographique du réseau national d'alimentation en eau potable." },
    ],
  },
  {
    slug: "acquisition-aerienne",
    title: "Acquisition Aérienne & LiDAR",
    color: "#00669D",
    heroImg: "https://etafat.ma/wp-content/uploads/2021/01/drone_acquisition.jpg",
    tagline: "Couvrir de vastes territoires avec une précision centimétrique.",
    intro: [
      "Quand le terrain est vaste, difficile d'accès ou soumis à des contraintes de délai, l'acquisition aérienne s'impose comme la réponse la plus efficace. Nos drones et capteurs LiDAR aéroportés capturent des millions de points de mesure en une seule mission, livrant des modèles numériques de terrain d'une précision inégalée.",
      "Des lignes électriques aux bassins versants, des zones forestières aux carrières en exploitation, Etafat déploie ses équipements de pointe pour vous fournir des données exploitables immédiatement par vos équipes d'ingénierie.",
    ],
    methods: [
      "Photogrammétrie par drone (UAV)",
      "LiDAR aéroporté haute densité",
      "Orthophotographies et orthocartes",
      "Modèles Numériques de Terrain (MNT)",
      "Modèles Numériques de Surface (MNS)",
      "Inspection d'ouvrages par drone",
      "Couverture de grandes surfaces",
      "Traitement et classification de nuages de points",
    ],
    highlight: { stat: "50 000 pts/m²", label: "densité LiDAR", desc: "Notre capteur LiDAR aéroporté atteint des densités de 50 000 points par m² pour une restitution fidèle du terrain et des ouvrages." },
    references: [
      { title: "Cartographie LiDAR du réseau autoroutier", client: "ADM", desc: "Levé aérien de 1 800 km d'autoroutes marocaines — MNT centimétrique et inventaire d'ouvrages géoréférencés." },
      { title: "Levé LiDAR de lignes THT", client: "ONEE", desc: "Acquisition aérienne de 600 km de lignes à très haute tension pour le contrôle des dégagements." },
      { title: "Couverture photogrammétrique rurale", client: "ANCFCC", desc: "Ortho-images à 5 cm/pixel sur 2 millions d'hectares pour la mise à jour du cadastre rural." },
    ],
  },
  {
    slug: "conseil-ingenierie",
    title: "Conseil & Ingénierie",
    color: "#007BFF",
    heroImg: "https://etafat.ma/wp-content/uploads/2021/01/ingenieurie_infrastructure.jpg",
    tagline: "Vos projets pilotés avec rigueur, de l'étude à la réception.",
    intro: [
      "Maîtres d'ouvrage publics et privés nous confient leurs projets d'infrastructure parce qu'ils savent qu'Etafat ira au-delà des livrables contractuels. Notre pôle Conseil & Ingénierie intervient en AMO, en études de faisabilité, en assistance technique et en pilotage de projets complexes.",
      "Quatre décennies d'expérience sur le terrain marocain nous ont appris à anticiper les risques fonciers, techniques et réglementaires. Nous apportons une vision intégrée qui fait gagner du temps, réduit les coûts et sécurise vos investissements.",
    ],
    methods: [
      "Assistance à Maîtrise d'Ouvrage (AMO)",
      "Études de faisabilité et d'impact",
      "Coordination et pilotage de projets",
      "Suivi de chantier géotechnique",
      "Audit technique et conformité",
      "Gestion des interfaces foncières",
      "Reporting et tableaux de bord projet",
      "Transfert de compétences",
    ],
    highlight: { stat: "+200", label: "projets d'infrastructure", desc: "Routes, ponts, aéroports, ports — Etafat a accompagné plus de 200 projets d'infrastructure majeurs en Afrique depuis sa création." },
    references: [
      { title: "AMO du projet d'autoroute de contournement", client: "ADM", desc: "Assistance technique et coordination foncière pour 120 km de nouvelle autoroute." },
      { title: "Étude de faisabilité d'aéroport régional", client: "ONDA", desc: "Étude géospatiale et foncière pour l'extension de 3 aéroports régionaux." },
      { title: "Pilotage de projets d'aménagement urbain", client: "Al Omrane", desc: "Suivi de 15 projets d'aménagement urbain représentant 8 000 lots à urbaniser." },
    ],
  },
  {
    slug: "modelisation-3d-bim",
    title: "Modélisation 3D & BIM",
    color: "#0057b8",
    heroImg: "https://etafat.ma/wp-content/uploads/2021/01/bim-batiment.jpg",
    tagline: "Du terrain au jumeau numérique, sans perte d'information.",
    intro: [
      "Le BIM (Building Information Modeling) n'est plus une option pour les grands projets : c'est une exigence. Etafat maîtrise toute la chaîne numérique, du relevé laser scanning du bâtiment existant jusqu'à la production de la maquette IFC livrée à vos équipes d'ingénierie et d'exploitation.",
      "Nos modèles 3D permettent de détecter les conflits en phase conception, de simuler les interventions en phase travaux, et d'alimenter les systèmes de gestion patrimoniale (GMAO). Chaque maquette est un actif numérique vivant qui suit votre ouvrage tout au long de son cycle de vie.",
    ],
    methods: [
      "Relevé laser scanning terrestre (3D)",
      "Production de maquettes BIM (Revit, IFC)",
      "Modélisation 3D de l'existant (as-built)",
      "Coordination BIM et détection de conflits",
      "Jumeaux numériques d'infrastructure",
      "Modèles 3D de terrain et d'ouvrages",
      "Visualisation et rendu 3D",
      "BIM pour la gestion patrimoniale (FM-BIM)",
    ],
    highlight: { stat: "LOD 400", label: "niveau de détail", desc: "Nos maquettes BIM atteignent le niveau LOD 400, offrant une précision suffisante pour la fabrication, l'installation et le contrôle des ouvrages." },
    references: [
      { title: "Maquette BIM du siège institutionnel", client: "OCP", desc: "Relevé 3D laser scanning et modélisation BIM niveau LOD 300 d'un complexe de 45 000 m²." },
      { title: "Jumeau numérique du réseau de distribution", client: "Amendis", desc: "Modélisation 3D du réseau d'eau et d'assainissement sur 3 villes marocaines." },
      { title: "BIM pour la réhabilitation patrimoniale", client: "Min. Équipement", desc: "Numérisation et maquettage BIM de 6 monuments historiques pour leur réhabilitation." },
    ],
  },
  {
    slug: "ingenierie-donnees",
    title: "Ingénierie des Données",
    color: "#00669D",
    heroImg: "https://etafat.ma/wp-content/uploads/2021/01/traitement.jpg",
    tagline: "Vos données géospatiales ont de la valeur. Nous la libérons.",
    intro: [
      "Dans un monde où les données géospatiales se multiplient à une vitesse vertigineuse, la vraie compétence est de les rendre utiles. Etafat structure, nettoie, enrichit et valorise vos données brutes pour les transformer en ressources exploitables par vos métiers.",
      "De la mise en place de pipelines d'ingestion automatisée à la construction d'entrepôts de données spatiales, en passant par l'analyse prédictive territoriale, nos ingénieurs data vous accompagnent dans votre transformation numérique géospatiale.",
    ],
    methods: [
      "Structuration et normalisation de données",
      "ETL et pipelines géospatiaux",
      "Entrepôts de données spatiales (PostGIS)",
      "Traitement de nuages de points LiDAR",
      "Analyse spatiale et modélisation prédictive",
      "Automatisation des traitements",
      "Visualisation et dataviz cartographique",
      "Interopérabilité et standards OGC",
    ],
    highlight: { stat: "1 Mrd+", label: "points de données traités", desc: "Nos pipelines géospatiaux traitent plus d'un milliard de points de données par an, alimentant les SIG, jumeaux numériques et systèmes décisionnels de nos clients." },
    references: [
      { title: "Pipeline LiDAR national", client: "ANCFCC", desc: "Automatisation du traitement de 500 millions de points LiDAR pour la production cartographique nationale." },
      { title: "Entrepôt de données foncières", client: "Al Omrane", desc: "Construction d'un data warehouse géospatial centralisant 30 ans de données patrimoniales." },
      { title: "Analyse prédictive des risques routiers", client: "ADM", desc: "Modélisation spatiale et analyse prédictive des zones à risque sur le réseau autoroutier national." },
    ],
  },
]

export function getExpertise(slug: string) {
  return expertises.find(e => e.slug === slug)
}

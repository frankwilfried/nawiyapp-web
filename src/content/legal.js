/**
 * MODÈLES à faire relire et valider par un juriste camerounais avant le lancement public.
 * Les passages entre crochets [ … ] sont à compléter (identité de l'éditeur, adresse, contact…).
 * Toute modification de fond → changer TERMS_VERSION (et nawiyapp-backend/src/lib/terms.js) :
 * les utilisateurs devront alors accepter la nouvelle version.
 */
export const TERMS_VERSION = '2026-10-01';
export const LEGAL_DRAFT = true; // bandeau « modèle en cours de validation » tant que true

const EDITEUR = '[Raison sociale], [forme juridique] au capital de [montant] FCFA, RCCM [numéro], NIU [numéro], siège : [adresse], Douala, Cameroun';
const CONTACT = '[email de contact]';

export const TERMS = {
  title: "Conditions générales d'utilisation",
  intro: `NawiyApp est édité par ${EDITEUR}. En utilisant l'application, tu acceptes les présentes conditions.`,
  sections: [
    ['Le service', [
      "NawiyApp t'aide à te déplacer à Douala et Yaoundé : itinéraires en transport informel (taxis collectifs, bus, moto-taxis) et courses à la demande avec des chauffeurs indépendants.",
      "Pour les courses à la demande, NawiyApp est un intermédiaire : il met en relation passagers et chauffeurs. Le transport est réalisé par le chauffeur, sous sa responsabilité.",
      "Les itinéraires, prix et durées indiqués pour le transport informel sont des estimations, sans garantie.",
    ]],
    ['Ton compte', [
      "Tu peux commander une course sans compte. Certaines fonctions (espace chauffeur, historique) demandent un compte.",
      "Tu dois donner des informations exactes et garder ton mot de passe secret. Tu es responsable de ce qui est fait avec ton compte.",
      "Il faut avoir au moins 18 ans pour créer un compte, ou l'accord d'un parent.",
    ]],
    ['Prix et paiement', [
      "Le prix conseillé est calculé par NawiyApp selon la distance et la catégorie (Éco, Confort, Moto). Tu peux proposer un autre prix dans la fourchette affichée ; le chauffeur est libre d'accepter ou de refuser.",
      "Le prix accepté au moment de la réservation est le prix de la course, sauf changement de destination demandé par le passager.",
      "Paiement en espèces au chauffeur ou par Mobile Money quand il est proposé. NawiyApp ne conserve jamais ton code secret Mobile Money.",
      "[Frais d'annulation : à définir — par exemple après X minutes d'attente du chauffeur au point de prise en charge.]",
    ]],
    ['Sécurité et comportement', [
      "Vérifie toujours le chauffeur avant de monter : nom, véhicule, plaque ou numéro visible, et signal de couleur affiché dans l'appli. Donne le code de départ seulement une fois dans le bon véhicule.",
      "Respect mutuel obligatoire : aucune violence, harcèlement, discrimination ou dégradation. En cas de problème, utilise le bouton Sécurité ou appelle les secours (police 117, pompiers 118).",
      "NawiyApp peut suspendre un compte en cas de fraude, de comportement dangereux ou de signalements répétés.",
    ]],
    ['Conditions chauffeurs', [
      "Pour recevoir des courses, le chauffeur fournit des pièces valides (CNI, permis, carte grise, photos) et les tient à jour. NawiyApp vérifie ces pièces avant d'activer le compte.",
      "Le chauffeur reste indépendant : il choisit quand se connecter et quelles courses accepter. Il est seul responsable de son véhicule, de son assurance, du respect du code de la route et du port du casque (moto, pour lui et le passager).",
      "NawiyApp perçoit une commission de 10 % du prix de chaque course réalisée via l'application. [Modalités de règlement de la commission : à définir.]",
      "Le chauffeur s'engage à ne pas utiliser les coordonnées des passagers en dehors des courses.",
      "Pendant qu'il est en ligne ou en session de conduite, la position GPS du chauffeur est enregistrée. Elle sert au service (attribution et suivi des courses) et à améliorer le réseau du transport informel : repérer automatiquement les arrêts, mesurer les durées des trajets. Ces traces ne sont jamais montrées aux passagers ni vendues, et sont supprimées après 6 mois ; seuls les résultats (arrêts, durées moyennes) sont conservés.",
    ]],
    ['Responsabilité', [
      "NawiyApp fait de son mieux pour que le service soit disponible, sans pouvoir le garantir en permanence (réseau, GPS, panne).",
      "NawiyApp n'est pas responsable des dommages causés pendant une course par le chauffeur ou le passager, sauf faute de sa part, dans les limites prévues par la loi.",
    ]],
    ['Données personnelles', [
      "Le traitement de tes données est décrit dans la politique de confidentialité, qui fait partie de ces conditions.",
    ]],
    ['Modification et droit applicable', [
      "Ces conditions peuvent évoluer ; tu seras prévenu et invité à accepter la nouvelle version.",
      "Elles sont soumises au droit camerounais. En cas de litige, une solution amiable est recherchée d'abord ; à défaut, les tribunaux de Douala sont compétents. [À valider par le juriste.]",
      `Contact : ${CONTACT}`,
    ]],
  ],
};

export const PRIVACY = {
  title: 'Politique de confidentialité',
  intro: `Responsable du traitement : ${EDITEUR}. Cette politique explique quelles données NawiyApp utilise, pourquoi, et quels sont tes droits, conformément à la réglementation camerounaise sur la protection des données personnelles et la cybersécurité. [Références des textes à confirmer par le juriste.]`,
  sections: [
    ['Données collectées', [
      "Compte : nom ou prénom, email, téléphone, mot de passe (stocké chiffré, jamais en clair).",
      "Course : points de départ et d'arrivée, position pendant la recherche et la course, prix, moyen de paiement, note et commentaire, message au chauffeur.",
      "Chauffeurs : pièces d'identité et du véhicule (CNI, permis, carte grise), photos, plaque ou numéro visible, position GPS quand ils sont en ligne ou en session de conduite, courses et gains.",
      "Technique : type d'appareil, journaux d'erreurs, abonnement aux notifications si tu les actives.",
    ]],
    ['Pourquoi', [
      "Réaliser les courses : trouver un chauffeur proche, afficher sa position, calculer le prix.",
      "Sécurité : vérifier l'identité des chauffeurs, traiter les signalements, prévenir la fraude.",
      "Améliorer les itinéraires du transport informel : les traces GPS des chauffeurs permettent de repérer les arrêts et de mesurer les durées (données agrégées, jamais publiées trajet par trajet). Les passagers ne sont pas suivis à cette fin.",
      "Respecter nos obligations légales (comptabilité, réquisitions des autorités).",
    ]],
    ['Qui voit quoi', [
      "Le chauffeur voit ton point de prise en charge, ta destination, ta position pendant l'approche et ton message. Le passager voit le nom, la photo, le véhicule, la plaque et le numéro du chauffeur.",
      "Pièces des chauffeurs : seule l'équipe NawiyApp y a accès, pour la vérification.",
      "Prestataires techniques, qui traitent les données pour notre compte : hébergement [Railway, base Neon], stockage des pièces [Cloudflare R2], suivi d'erreurs [Sentry], recherche d'adresses [Google], cartes et itinéraires [OpenStreetMap / OSRM], paiement [MTN MoMo]. Certains sont situés hors du Cameroun : [garanties de transfert à préciser].",
      "NawiyApp ne vend pas tes données.",
    ]],
    ['Durée de conservation', [
      "Compte : tant qu'il est actif, puis [X] mois après sa suppression.",
      "Courses : [X] ans (preuve et comptabilité). Positions GPS détaillées : [X] mois, puis anonymisées.",
      "Pièces des chauffeurs : pendant l'activité du chauffeur, puis [X] mois. Pièces refusées : supprimées sous [X] jours.",
      "Traces GPS des chauffeurs : 6 mois, puis supprimées automatiquement (seuls les arrêts et durées moyennes déduits sont gardés).",
    ]],
    ['Tes droits', [
      "Tu peux demander l'accès à tes données, leur correction ou leur suppression, et t'opposer à certains usages.",
      `Écris à ${CONTACT}. Réponse sous [30] jours. Tu peux aussi saisir l'autorité de protection des données compétente.`,
    ]],
    ['Sécurité', [
      "Connexions chiffrées (HTTPS), mots de passe chiffrés, pièces stockées dans un espace privé, accès limité à l'équipe habilitée.",
    ]],
  ],
};

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import en from './locales/en.json'
import ar from './locales/ar.json'
import enExtras from './locales/extras/en'
import frExtras from './locales/extras/fr'
import arExtras from './locales/extras/ar'

const legacyFr = {
  'Admin Dashboard': 'Tableau de bord administrateur',
  'Central view of the platform. Use the fixed sidebar to open each entity CRUD page.':
    "Vue centrale de la plateforme. Utilisez la barre laterale fixe pour ouvrir chaque page CRUD d'entite.",
  'Last sync {{time}}': 'Derniere synchro {{time}}',
  'No sync yet': 'Aucune synchro',
  'Platform Data': 'Donnees plateforme',
  ERROR: 'ERREUR',
  SYNCED: 'SYNCHRO',
  'Admin access only': 'Acces admin uniquement',
  Dashboard: 'Tableau de bord',
  'Dashboard Overview': 'Apercu du tableau de bord',
  Modules: 'Modules',
  Workspace: 'Espace de travail',
  'Connected User': 'Utilisateur connecte',
  User: 'Utilisateur',
  'Admin Navigation': 'Navigation admin',
  'Full CRUD management for {{entity}}.': 'Gestion CRUD complete pour {{entity}}.',
  'New Record': 'Nouvel enregistrement',
  'Search {{entity}}': 'Rechercher {{entity}}',
  '{{entity}} Records': 'Enregistrements {{entity}}',
  '{{shown}} / {{total}} shown': '{{shown}} / {{total}} affiches',
  Create: 'Creer',
  Edit: 'Modifier',
  'Fill the fields and save changes.': 'Renseignez les champs et enregistrez.',
  'Select...': 'Selectionner...',
  Yes: 'Oui',
  No: 'Non',
  'Saving...': 'Enregistrement...',
  Save: 'Enregistrer',
  Cancel: 'Annuler',
  'Create mode': 'Mode creation',
  'Edit mode': 'Mode modification',
  'Unable to save changes.': "Impossible d'enregistrer les modifications.",
  'Unable to delete record.': "Impossible de supprimer l'enregistrement.",
  'Failed to load {{entity}}.': 'Impossible de charger {{entity}}.',
  'Failed to load module data.': 'Impossible de charger les donnees du module.',
  'Load failed': 'Chargement echoue',
  'Service not configured': 'Service non configure',
  'Welcome Back!': 'Bon retour !',
  'User / Email': 'Utilisateur / Email',
  Password: 'Mot de passe',
  'Remember Me': 'Se souvenir de moi',
  'Forgot Password?': 'Mot de passe oublie ?',
  'Signing in...': 'Connexion...',
  Login: 'Se connecter',
  Messenger: 'Messagerie',
  'Welcome, {{name}}!': 'Bienvenue, {{name}} !',
  'Preparing your {{role}} dashboard...': 'Preparation de votre tableau de bord {{role}}...',
  'Back to Website': 'Retour au site',
  role: {
    administrateur: 'Administrateur',
    admin: 'Admin',
    manager: 'Manager',
    technicien: 'Technicien',
    chefstock: 'Chef stock',
    receptioniste: 'Receptionniste',
    fournisseur: 'Fournisseur',
  },
}

const savedLanguage = localStorage.getItem('language') || 'fr'

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: { ...fr, ...legacyFr, ...frExtras } },
    en: { translation: { ...en, ...enExtras } },
    ar: { translation: { ...ar, ...arExtras } },
  },
  lng: savedLanguage,
  fallbackLng: 'fr',
  supportedLngs: ['fr', 'en', 'ar'],
  keySeparator: false,
  interpolation: {
    escapeValue: false,
  },
  returnEmptyString: false,
  returnNull: false,
})

document.documentElement.lang = savedLanguage
document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr'

export default i18n

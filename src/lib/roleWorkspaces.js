import {
  Boxes,
  Building2,
  ClipboardList,
  HardDrive,
  MessageCircle,
  ReceiptText,
  Users,
  Wrench,
  Tags,
  Truck,
  Package,
} from 'lucide-react'

export const ROLE_WORKSPACES = {
  administrateur: {
    title: 'Administrateur Workspace',
    subtitle: 'Manage users and departments with full administrative control.',
    badgeClass: 'border-[#7a3f3f]/25 bg-[#7a3f3f]/10 text-[#7a3f3f]',
    iconClass: 'bg-[#7a3f3f]/10 text-[#7a3f3f]',
    modules: [
      {
        key: 'users',
        label: 'Users',
        serviceKey: 'users',
        icon: Users,
        columns: ['id', 'username', 'email', 'role', 'telephone'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'departments',
        label: 'Departments',
        serviceKey: 'departments',
        icon: Building2,
        columns: ['id', 'nom_dept', 'description', 'date_creation'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'pieces',
        label: 'Stock Pièce',
        serviceKey: 'pieces',
        icon: Boxes,
        columns: ['id', 'nom', 'categorie', 'quantite_stock', 'prix_unitaire'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'demande-pieces',
        label: 'Pièce Demandée',
        serviceKey: 'demande-pieces',
        icon: ClipboardList,
        columns: ['id', 'fiche', 'piece', 'quantite', 'statut', 'date_demande'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'interventions',
        label: 'Interventions',
        serviceKey: 'interventions',
        icon: Wrench,
        columns: ['id', 'demande', 'technicien', 'diagnostic', 'statut', 'date_debut', 'date_fin'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'achat-piece',
        label: 'Achat Pièce',
        serviceKeys: ['fournisseurs', 'commandes-pieces', 'prix-fournisseurs'],
        icon: Package,
        description: 'Regroupe les fournisseurs, commandes de pièces et prix fournisseurs.',
        permissions: { create: true, update: true, delete: true },
      },
    ],
  },
  manager: {
    title: 'Manager Workspace',
    subtitle: 'Supervise operations, interventions, and validation flow.',
    badgeClass: 'border-[#2b8ea9]/25 bg-[#2b8ea9]/10 text-[#2b8ea9]',
    iconClass: 'bg-[#2b8ea9]/10 text-[#2b8ea9]',
    modules: [
      {
        key: 'demande-maintenances',
        label: 'Maintenance Requests',
        serviceKey: 'demande-maintenances',
        icon: ClipboardList,
        columns: ['id', 'materiel', 'receptioniste', 'manager', 'priorite', 'statut', 'date_creation'],
        permissions: { create: false, update: true, delete: false },
        editableFields: ['materiel', 'receptioniste', 'manager', 'priorite'],
        readOnlyFields: ['materiel', 'receptioniste', 'manager', 'priorite'],
      },
      {
        key: 'interventions',
        label: 'Interventions',
        serviceKey: 'interventions',
        icon: Wrench,
        columns: ['id', 'demande', 'technicien', 'diagnostic', 'statut', 'date_debut', 'date_fin'],
        permissions: { create: true, update: true, delete: false },
        editableFields: ['demande', 'technicien', 'diagnostic', 'solution_proposee', 'date_debut', 'date_fin'],
      },
      {
        key: 'fiche-reparations',
        label: 'Fiche Reparations',
        serviceKey: 'fiche-reparations',
        icon: ClipboardList,
        columns: [
          'id',
          'intervention',
          'description_panne',
          'solution',
          'cout_main_oeuvre',
          'frais_societe',
          'prix_supplementaire',
          'confirmation',
          'valide_manager',
        ],
        permissions: { create: true, update: true, delete: false },
        editableFields: [
          'intervention',
          'description_panne',
          'solution',
          'cout_main_oeuvre',
          'frais_societe',
          'prix_supplementaire',
          'confirmation',
          'valide_manager',
        ],
        description: 'Create and supervise repair sheets, then validate final approval.',
      },
      {
        key: 'factures',
        label: 'Factures',
        serviceKey: 'factures',
        icon: ReceiptText,
        columns: ['id', 'client', 'montant_total', 'est_payee', 'date_facture'],
        permissions: { create: true, update: false, delete: false },
        editableFields: ['intervention', 'client', 'date_facture'],
        readOnlyFields: ['montant_total'],
      },
      {
        key: 'messages',
        label: 'Messages',
        serviceKey: 'messages',
        icon: MessageCircle,
        columns: ['id', 'expediteur', 'destinataire', 'objet', 'contenu', 'date_envoi'],
        permissions: { create: true, update: false, delete: false },
        editableFields: ['destinataire', 'objet', 'contenu'],
      },
    ],
  },
  technicien: {
    title: 'Technicien Workspace',
    subtitle: 'Execute interventions and track technical requests.',
    badgeClass: 'border-[#2a6f8a]/25 bg-[#2a6f8a]/10 text-[#2a6f8a]',
    iconClass: 'bg-[#2a6f8a]/10 text-[#2a6f8a]',
    modules: [
      {
        key: 'interventions',
        label: 'Interventions',
        serviceKey: 'interventions',
        icon: Wrench,
        columns: ['id', 'demande', 'technicien', 'diagnostic', 'solution_proposee', 'statut'],
        useMineEndpoint: true,
        permissions: { create: false, update: true, delete: false },
        editableFields: ['demande', 'technicien', 'diagnostic', 'solution_proposee', 'date_debut', 'date_fin'],
        readOnlyFields: ['demande', 'technicien', 'date_debut', 'date_fin'],
        requiredFields: ['diagnostic', 'solution_proposee'],
      },
      {
        key: 'messages',
        label: 'Messages',
        serviceKey: 'messages',
        icon: MessageCircle,
        columns: ['id', 'expediteur', 'destinataire', 'objet', 'contenu', 'date_envoi'],
        permissions: { create: true, update: false, delete: false },
        editableFields: ['destinataire', 'objet', 'contenu'],
      },
    ],
  },
  chefstock: {
    title: 'Chef Stock Workspace',
    subtitle: 'Control stock levels, parts demand, and material flow.',
    badgeClass: 'border-[#2f7f67]/25 bg-[#2f7f67]/10 text-[#2f7f67]',
    iconClass: 'bg-[#2f7f67]/10 text-[#2f7f67]',
    modules: [
      {
        key: 'pieces',
        label: 'Stock Pièce',
        serviceKey: 'pieces',
        icon: Boxes,
        columns: ['id', 'nom', 'categorie', 'quantite_stock', 'prix_unitaire'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'categories-materiel',
        label: 'Categories Materiel',
        serviceKey: 'categories-materiel',
        icon: Tags,
        columns: ['id', 'nom', 'description', 'is_active', 'date_creation'],
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'demande-pieces',
        label: 'Pièce Demandée',
        serviceKey: 'demande-pieces',
        icon: ClipboardList,
        columns: ['id', 'fiche', 'piece', 'quantite', 'statut', 'date_demande'],
        permissions: { create: false, update: true, delete: false },
        editableFields: [],
      },
      {
        key: 'achat-piece',
        label: 'Achat Pièce',
        serviceKeys: ['fournisseurs', 'commandes-pieces', 'prix-fournisseurs'],
        icon: Package,
        description: 'Regroupe les fournisseurs, les commandes de pièces et les prix fournisseurs.',
        permissions: { create: true, update: true, delete: true },
      },
      {
        key: 'messages',
        label: 'Messages',
        serviceKey: 'messages',
        icon: MessageCircle,
        columns: ['id', 'expediteur', 'destinataire', 'objet', 'contenu', 'date_envoi'],
        permissions: { create: true, update: false, delete: false },
        editableFields: ['destinataire', 'objet', 'contenu'],
      },
    ],
  },
  receptioniste: {
    title: 'Receptioniste Workspace',
    subtitle: 'Manage client intake, devices reception, and communication.',
    badgeClass: 'border-[#9d6b3f]/25 bg-[#9d6b3f]/10 text-[#9d6b3f]',
    iconClass: 'bg-[#9d6b3f]/10 text-[#9d6b3f]',
    modules: [
      {
        key: 'clients',
        label: 'Clients',
        serviceKey: 'clients',
        icon: Users,
        columns: ['id', 'nom_complet', 'email', 'telephone', 'adresse'],
        permissions: { create: true, update: true, delete: false },
      },
      {
        key: 'materiels',
        label: 'Materiels',
        serviceKey: 'materiels',
        icon: HardDrive,
        columns: ['id', 'client', 'type', 'marque', 'modele', 'etat'],
        permissions: { create: true, update: true, delete: false },
      },
      {
        key: 'demande-maintenances',
        label: 'Maintenance Requests',
        serviceKey: 'demande-maintenances',
        icon: ClipboardList,
          columns: ['id', 'materiel', 'manager', 'priorite', 'statut', 'date_creation'],
          useMineEndpoint: true,
          permissions: { create: true, update: true, delete: false },
            editableFields: ['materiel', 'manager', 'priorite'],
      },
      {
        key: 'factures',
        label: 'Paiements',
        serviceKey: 'factures',
        icon: ReceiptText,
        columns: ['id', 'intervention', 'client', 'montant_total', 'date_facture', 'est_payee'],
        permissions: { create: false, update: true, delete: false },
        editableFields: ['intervention', 'client', 'montant_total', 'date_facture'],
        readOnlyFields: ['intervention', 'client', 'montant_total', 'date_facture'],
      },
      {
        key: 'messages',
        label: 'Messages',
        serviceKey: 'messages',
        icon: MessageCircle,
        columns: ['id', 'expediteur', 'destinataire', 'objet', 'contenu', 'date_envoi'],
        permissions: { create: true, update: false, delete: false },
        editableFields: ['destinataire', 'objet', 'contenu'],
      },
    ],
  },
}

ROLE_WORKSPACES.admin = ROLE_WORKSPACES.administrateur


export function roleDashboardPath(role) {
  return `/${role}`
}

const ACHAT_SUB_ROUTES = {
  fournisseurs: 'fournisseurs',
  'commandes-pieces': 'commandes',
  commandes: 'commandes',
  'prix-fournisseurs': 'prix',
  prix: 'prix',
  'suivi-achat': 'suivi-achat',
}

export function roleModulePath(role, moduleKey) {
  const baseRole = role === 'administrateur' ? 'admin' : role

  if ((baseRole === 'chefstock' || baseRole === 'admin') && moduleKey === 'achat-piece') {
    return `/${baseRole}/achat-piece`
  }

  if (ACHAT_SUB_ROUTES[moduleKey] && (baseRole === 'chefstock' || baseRole === 'admin')) {
    return `/${baseRole}/${ACHAT_SUB_ROUTES[moduleKey]}`
  }

  return `/${baseRole}/modules/${moduleKey}`
}

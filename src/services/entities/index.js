import categoriesMaterielService from './categoriesMateriel.service'
import clientsService from './clients.service'
import demandeMaintenancesService from './demandeMaintenances.service'
import demandePiecesService from './demandePieces.service'
import departmentsService from './departments.service'
import facturesService from './factures.service'
import ficheReparationsService from './ficheReparations.service'
import interventionsService from './interventions.service'
import materielsService from './materiels.service'
import messagesService from './messages.service'
import paiementsService from './paiements.service'
import piecesService from './pieces.service'
import usersService from './users.service'

export const entityServices = {
  users: usersService,
  departments: departmentsService,
  clients: clientsService,
  'categories-materiel': categoriesMaterielService,
  materiels: materielsService,
  'demande-maintenances': demandeMaintenancesService,
  interventions: interventionsService,
  'fiche-reparations': ficheReparationsService,
  pieces: piecesService,
  'demande-pieces': demandePiecesService,
  factures: facturesService,
  paiements: paiementsService,
  messages: messagesService,
}

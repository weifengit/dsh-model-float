/**
 * Model Float — the card catalog.
 *
 * The wall shows eleven cards, each a pure function from one endpoint's
 * payload to a small fixed vocabulary. This module is the one place that
 * knows what they are; the wall iterates over this list and never
 * hard-codes a card.
 *
 * @module client/src/features/wall/cards.ts
 */

import { auditCard } from './cards/audit.ts'
import { coreCard } from './cards/core.ts'
import { deviceCard } from './cards/device.ts'
import { groupsCard } from './cards/groups.ts'
import { networkCard } from './cards/network.ts'
import { projectsCard } from './cards/projects.ts'
import { sessionsCard } from './cards/sessions.ts'
import { skillsCard } from './cards/skills.ts'
import { storageCard } from './cards/storage.ts'
import { tokenCard } from './cards/token.ts'
import { toolsCard } from './cards/tools.ts'
import type { CardDefinition } from './reading.ts'

/** Every card the wall knows how to render, in the order they first appear. */
export const CARDS: readonly CardDefinition[] = [
  sessionsCard,
  deviceCard,
  tokenCard,
  networkCard,
  coreCard,
  storageCard,
  projectsCard,
  toolsCard,
  skillsCard,
  groupsCard,
  auditCard,
]

/** A card by its stable id. */
export function cardById(id: string): CardDefinition | undefined {
  return CARDS.find(card => card.id === id)
}

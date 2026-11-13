export interface TourStep { id: string; stage: number; stageTitle: string; target: string; text: string; dwellMs?: number; viewScale?: number }

/**
 * SOLAR SYSTEM TOUR: a guided flight through the bodies of the Solar System, ending at the two worlds whose landing
 * sites can be explored (the Moon and Mars). Replaces the former universe-scale "Find Home" tour; the tour engine
 * (store.ts runStep / pause / resume / skip / exit) is unchanged.
 */
export const STAGES = [
  'The Sun',
  'The inner planets',
  'Earth and the Moon',
  'Mars',
  'The giant planets',
]

export const TOUR: TourStep[] = [
  { id: 't1', stage: 1, stageTitle: STAGES[0], target: 'sun', text: 'The Sun holds 99.86% of the Solar System’s mass. Planet sizes in this view are exaggerated so they can be seen; orbit shapes and relative distances come from an approximate Keplerian model for the selected date.' },
  { id: 't2', stage: 2, stageTitle: STAGES[1], target: 'mercury', text: 'Mercury, the innermost planet. MESSENGER orbited it from 2011 until it was deliberately crashed into the surface on 30 April 2015.' },
  { id: 't3', stage: 2, stageTitle: STAGES[1], target: 'venus', text: 'Venus, under a thick CO₂ atmosphere with a surface near 465 °C. Soviet Venera landers returned the only photographs from its surface.' },
  { id: 't4', stage: 3, stageTitle: STAGES[2], target: 'earth', text: 'Earth, where every mission in this experience began.' },
  { id: 't5', stage: 3, stageTitle: STAGES[2], target: 'moon', text: 'The Moon. Six Apollo crews landed here between 1969 and 1972 and left their descent stages, rovers and experiments behind. Select the Moon and choose Explore to walk among them.' },
  { id: 't6', stage: 4, stageTitle: STAGES[3], target: 'mars', text: 'Mars. Landers and rovers from Viking (1976) to InSight (2018) still rest on its surface. Select Mars and choose Explore to visit their landing sites.' },
  { id: 't7', stage: 5, stageTitle: STAGES[4], target: 'jupiter', text: 'Jupiter, the largest planet. Galileo was sent into its atmosphere in 2003 to protect Europa from contamination.' },
  { id: 't8', stage: 5, stageTitle: STAGES[4], target: 'saturn', text: 'Saturn and its rings. Cassini ended its mission by plunging into Saturn on 15 September 2017.' },
  { id: 't9', stage: 5, stageTitle: STAGES[4], target: 'uranus', text: 'Uranus, an ice giant tilted on its side. Voyager 2 is the only spacecraft to have visited it (January 1986).' },
  { id: 't10', stage: 5, stageTitle: STAGES[4], target: 'neptune', text: 'Neptune, the outermost planet. Voyager 2 flew past it in August 1989 and is now in interstellar space, still transmitting.' },
]

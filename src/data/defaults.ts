import type {
  AbilityKey,
  Attack,
  Character,
  FeatureEntry,
  InventoryItem,
  Journal,
  Proficiency,
  SkillKey,
  SpellEntry,
} from '@/types/character'
import { CLASSES, SKILLS, findClass, slotsForClass } from './rules'

/** Identificadores de las entradas anidadas dentro del jsonb (ataques, objetos…). */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

/**
 * Identificador de una ficha. Es un UUID de verdad porque acaba siendo la
 * clave primaria de la tabla `characters` en Supabase.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Reserva para contextos no seguros, donde randomUUID no existe.
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** ¿Este id sirve como clave primaria uuid? Las fichas viejas usaban `pc_xxx`. */
export function isUuid(id: string): boolean {
  return UUID_RE.test(id)
}

function emptySkills(): Record<SkillKey, Proficiency> {
  return Object.fromEntries(SKILLS.map((s) => [s.key, 0])) as Record<SkillKey, Proficiency>
}

const PORTRAIT_SLUGS: Record<string, string> = {
  'Bárbaro': 'barbaro', 'Bardo': 'bardo', 'Brujo': 'brujo', 'Clérigo': 'clerigo',
  'Druida': 'druida', 'Explorador': 'explorador', 'Guerrero': 'guerrero',
  'Hechicero': 'hechicero', 'Mago': 'mago', 'Monje': 'monje',
  'Paladín': 'paladin', 'Pícaro': 'picaro',
}

export function portraitForClass(className: string): string {
  const slug = PORTRAIT_SLUGS[className] ?? 'default'
  return `assets/portraits/${slug}.svg`
}

export function createCharacter(partial?: Partial<Character>): Character {
  const now = new Date().toISOString()
  const cls = CLASSES[6] // Guerrero por defecto
  const base: Character = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    identity: {
      name: 'Sin nombre',
      player: '',
      className: cls.name,
      subclass: '',
      level: 1,
      species: 'Humano',
      background: 'Soldado',
      alignment: 'Neutral',
      xp: 0,
      portrait: portraitForClass(cls.name),
      accent: cls.accent,
      tagline: '',
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    skills: emptySkills(),
    combat: {
      armorClass: 10,
      speed: 9,
      initiativeBonus: 0,
      hpMax: 10,
      hpCurrent: 10,
      hpTemp: 0,
      hitDieSize: cls.hitDie,
      hitDiceTotal: 1,
      hitDiceSpent: 0,
      deathSuccesses: 0,
      deathFailures: 0,
      heroicInspiration: false,
      exhaustion: 0,
      conditions: [],
      attacks: [],
    },
    spellcasting: {
      ability: cls.spellAbility,
      slots: slotsForClass(cls.caster, 1).map((s) => ({ ...s, used: 0 })),
      spells: [],
      notes: '',
    },
    inventory: {
      coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      items: [],
      notes: '',
    },
    features: { entries: [], languages: ['Común'], armor: '', weapons: '', tools: '' },
    journal: { personality: '', ideals: '', bonds: '', flaws: '', backstory: '', allies: '', notes: '' },
  }
  return { ...base, ...partial }
}

/**
 * Fecha fija para la party de ejemplo: así `scripts/generate-seed.mjs` produce
 * siempre el mismo `supabase/seed.sql` y no ensucia el diff en cada ejecución.
 */
const DEMO_TIMESTAMP = '2026-01-01T00:00:00.000Z'

// ── Fábricas de entradas anidadas, con valores por defecto razonables ────────

/** Arma. Los ids se asignan en `build` a partir del slug del personaje. */
function wp(
  name: string,
  ability: AbilityKey,
  damage: string,
  damageType: string,
  extra: Partial<Omit<Attack, 'id' | 'name' | 'ability' | 'damage' | 'damageType'>> = {},
): Omit<Attack, 'id'> {
  return {
    name,
    ability,
    proficient: true,
    damage,
    damageType,
    range: 'Cuerpo a cuerpo',
    mastery: '—',
    notes: '',
    ...extra,
  }
}

function sp(
  name: string,
  level: number,
  school: string,
  extra: Partial<Omit<SpellEntry, 'id' | 'name' | 'level' | 'school'>> = {},
): Omit<SpellEntry, 'id'> {
  return {
    name,
    level,
    school,
    castingTime: '1 acción',
    range: 'Toque',
    components: 'V, S',
    duration: 'Instantáneo',
    concentration: false,
    ritual: false,
    prepared: true,
    description: '',
    ...extra,
  }
}

function it(name: string, extra: Partial<Omit<InventoryItem, 'id' | 'name'>> = {}): Omit<InventoryItem, 'id'> {
  return { name, quantity: 1, weight: 0, attuned: false, equipped: false, notes: '', ...extra }
}

function ft(
  name: string,
  source: string,
  description: string,
  extra: Partial<Omit<FeatureEntry, 'id' | 'name' | 'source' | 'description'>> = {},
): Omit<FeatureEntry, 'id'> {
  return { name, source, description, usesMax: 0, usesSpent: 0, recharge: 'none', ...extra }
}

interface DemoSpec {
  /** Prefijo determinista para los ids de ataques, conjuros, objetos y rasgos. */
  slug: string
  species: string
  background: string
  tagline: string
  subclass?: string
  abilities: Record<AbilityKey, number>
  skills: SkillKey[]
  ac: number
  hp: number
  hpCurrent?: number
  speed?: number
  conditions?: string[]
  heroicInspiration?: boolean
  exhaustion?: number
  attacks?: Omit<Attack, 'id'>[]
  spells?: Omit<SpellEntry, 'id'>[]
  /** Espacios gastados por nivel de conjuro, p. ej. `{ 1: 2 }`. */
  slotsUsed?: Record<number, number>
  spellNotes?: string
  coins?: Partial<Character['inventory']['coins']>
  items?: Omit<InventoryItem, 'id'>[]
  inventoryNotes?: string
  features?: Omit<FeatureEntry, 'id'>[]
  languages?: string[]
  armorProf?: string
  weaponProf?: string
  toolProf?: string
  journal?: Partial<Journal>
}

function build(name: string, className: string, level: number, spec: DemoSpec): Character {
  const cls = findClass(className)!
  const c = createCharacter()
  const skills = emptySkills()
  for (const s of spec.skills) skills[s] = 1

  const slots = slotsForClass(cls.caster, level).map((s) => ({
    ...s,
    used: Math.min(spec.slotsUsed?.[s.level] ?? 0, s.total),
  }))

  return {
    ...c,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    identity: {
      ...c.identity,
      name,
      className,
      subclass: spec.subclass ?? '',
      level,
      species: spec.species,
      background: spec.background,
      tagline: spec.tagline,
      accent: cls.accent,
      portrait: portraitForClass(className),
    },
    abilities: spec.abilities,
    saves: Object.fromEntries(
      (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((k) => [
        k,
        cls.saves.includes(k) ? 1 : 0,
      ]),
    ) as Record<AbilityKey, Proficiency>,
    skills,
    combat: {
      ...c.combat,
      armorClass: spec.ac,
      speed: spec.speed ?? c.combat.speed,
      hpMax: spec.hp,
      hpCurrent: spec.hpCurrent ?? spec.hp,
      hitDieSize: cls.hitDie,
      hitDiceTotal: level,
      heroicInspiration: spec.heroicInspiration ?? false,
      exhaustion: spec.exhaustion ?? 0,
      conditions: spec.conditions ?? [],
      attacks: (spec.attacks ?? []).map((a, i) => ({ ...a, id: `${spec.slug}-atk-${i + 1}` })),
    },
    spellcasting: {
      ...c.spellcasting,
      ability: cls.spellAbility,
      slots,
      spells: (spec.spells ?? []).map((s, i) => ({ ...s, id: `${spec.slug}-spell-${i + 1}` })),
      notes: spec.spellNotes ?? '',
    },
    inventory: {
      ...c.inventory,
      coins: { ...c.inventory.coins, ...spec.coins },
      items: (spec.items ?? []).map((item, i) => ({ ...item, id: `${spec.slug}-item-${i + 1}` })),
      notes: spec.inventoryNotes ?? '',
    },
    features: {
      ...c.features,
      entries: (spec.features ?? []).map((f, i) => ({ ...f, id: `${spec.slug}-feat-${i + 1}` })),
      languages: spec.languages ?? c.features.languages,
      armor: spec.armorProf ?? '',
      weapons: spec.weaponProf ?? '',
      tools: spec.toolProf ?? '',
    },
    journal: { ...c.journal, ...spec.journal },
  }
}

/**
 * Party de ejemplo. Todas las secciones vienen rellenas (ataques, conjuros,
 * equipo, rasgos y diario) para poder probar la ficha entera con datos reales.
 */
export function demoRoster(): Character[] {
  return [
    build('Kaelith Vroun', 'Mago', 3, {
      slug: 'kaelith',
      species: 'Elfo',
      background: 'Sabio',
      subclass: 'Evocación',
      tagline: 'La biblioteca arde y él sigue leyendo',
      abilities: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
      skills: ['arcana', 'history', 'investigation'],
      ac: 12,
      hp: 20,
      hpCurrent: 14,
      slotsUsed: { 1: 2 },
      attacks: [
        wp('Daga', 'dex', '1d4', 'Perforante', { range: 'Cuerpo a cuerpo o 6/18 m', mastery: 'Sajar' }),
        wp('Bastón arcano', 'str', '1d6', 'Contundente', { notes: 'A dos manos: 1d8.' }),
        wp('Rayo de escarcha', 'int', '1d8', 'Frío', {
          range: '18 m',
          mastery: '—',
          proficient: true,
          notes: 'Truco. La velocidad del objetivo baja 3 m.',
        }),
      ],
      spells: [
        sp('Rayo de escarcha', 0, 'Evocación', { range: '18 m', description: 'Ataque de conjuro; 1d8 de frío y −3 m de velocidad.' }),
        sp('Prestidigitación', 0, 'Transmutación', { range: '3 m', duration: 'Hasta 1 hora', description: 'Truquitos sensoriales sin importancia mecánica.' }),
        sp('Luz', 0, 'Evocación', { components: 'V, M', duration: '1 hora', description: 'Un objeto irradia luz brillante en 6 m.' }),
        sp('Proyectil mágico', 1, 'Evocación', { range: '36 m', description: 'Tres dardos de 1d4+1 de fuerza que impactan sin fallar.' }),
        sp('Escudo', 1, 'Abjuración', { castingTime: '1 reacción', range: 'Personal', duration: '1 asalto', description: '+5 a la CA hasta tu siguiente turno; anula Proyectil mágico.' }),
        sp('Detectar magia', 1, 'Adivinación', { components: 'V, S', concentration: true, ritual: true, duration: 'Conc., 10 min', prepared: false, description: 'Percibes auras mágicas a 9 m.' }),
        sp('Rayo abrasador', 2, 'Evocación', { range: '36 m', description: 'Tres rayos de 2d6 de fuego; añade el mod. de lanzamiento con Evocación potente.' }),
        sp('Levitar', 2, 'Transmutación', { components: 'V, S, M', concentration: true, duration: 'Conc., 10 min', prepared: false, description: 'Un objeto o criatura flota hasta 6 m.' }),
      ],
      spellNotes: 'Grimorio con 12 conjuros más sin preparar. Foco de lanzamiento: cristal tallado.',
      coins: { gp: 42, sp: 15 },
      items: [
        it('Grimorio', { equipped: true, weight: 1.5, notes: 'Cubierta de cuero azul con cierre de latón.' }),
        it('Cristal de lanzamiento', { equipped: true, notes: 'Foco arcano.' }),
        it('Bolsa de componentes', { weight: 1 }),
        it('Túnica de viajero', { equipped: true }),
        it('Poción de curación', { quantity: 2, notes: '2d4+2 al beberla (acción adicional).' }),
        it('Raciones', { quantity: 5, weight: 1 }),
        it('Antorcha', { quantity: 3 }),
      ],
      features: [
        ft('Recuperación arcana', 'Mago', 'Una vez al día tras un descanso corto recuperas espacios de conjuro con niveles sumados hasta 2.', { usesMax: 1, recharge: 'long' }),
        ft('Evocación potente', 'Evocación', 'Añades tu modificador de Inteligencia al daño de un objetivo de tus trucos de evocación.', {}),
        ft('Esculpir conjuros', 'Evocación', 'Al evocar de área, eliges hasta 1 + nivel del conjuro criaturas que superan la salvación y no reciben daño.', {}),
        ft('Linaje feérico', 'Elfo', 'Ventaja contra ser encantado; la magia no te duerme.', {}),
      ],
      languages: ['Común', 'Élfico', 'Dracónico', 'Infracomún'],
      armorProf: 'Ninguna',
      weaponProf: 'Armas simples',
      toolProf: 'Suministros de caligrafía',
      journal: {
        personality: 'Habla despacio y cita libros que nadie más ha leído.',
        ideals: 'El conocimiento que no se comparte se pudre.',
        bonds: 'La biblioteca de Vroun ardió por su culpa. Está reconstruyéndola de memoria.',
        flaws: 'Antepone un dato curioso a su propia seguridad.',
        backstory: 'Tercer hijo de una casa menor, cambió el título por un puesto de archivero. Encontró en los sótanos un tratado de evocación que no debería existir.',
        allies: 'Maestra Oriel, del Colegio de Cristal. El librero Fenn, que le debe favores.',
        notes: 'Persigue las páginas dispersas del tratado de Aldaric.',
      },
    }),
    build('Brann Hierroviejo', 'Bárbaro', 3, {
      slug: 'brann',
      species: 'Goliat',
      background: 'Soldado',
      subclass: 'Senda del Berserker',
      tagline: 'Habla poco. Rompe mucho.',
      abilities: { str: 17, dex: 13, con: 16, int: 8, wis: 12, cha: 10 },
      skills: ['athletics', 'intimidation', 'survival', 'perception'],
      ac: 15,
      hp: 34,
      hpCurrent: 26,
      speed: 12,
      heroicInspiration: true,
      attacks: [
        wp('Gran hacha', 'str', '1d12', 'Cortante', { mastery: 'Hendidura', notes: 'A dos manos. +2 al daño por Furia.' }),
        wp('Hacha de mano', 'str', '1d6', 'Cortante', { range: 'Cuerpo a cuerpo o 6/18 m', mastery: 'Sajar' }),
        wp('Puño', 'str', '1', 'Contundente', { mastery: '—' }),
      ],
      coins: { gp: 12, sp: 40 },
      items: [
        it('Gran hacha', { equipped: true, weight: 3 }),
        it('Hacha de mano', { quantity: 2, weight: 1 }),
        it('Armadura de pieles', { equipped: true, weight: 6 }),
        it('Petate de aventurero', { weight: 5 }),
        it('Cuerda de cáñamo (15 m)', { weight: 3 }),
        it('Raciones', { quantity: 10, weight: 1 }),
        it('Medalla del regimiento', { notes: 'Del Segundo de Piedracorva. Todos muertos menos él.' }),
      ],
      features: [
        ft('Furia', 'Bárbaro', 'Acción adicional. Ventaja en pruebas y salvaciones de Fuerza, +2 al daño cuerpo a cuerpo y resistencia a contundente, cortante y perforante. Dura 1 minuto.', { usesMax: 3, usesSpent: 1, recharge: 'long' }),
        ft('Ataque temerario', 'Bárbaro', 'Al atacar con Fuerza, tiras con ventaja; a cambio los ataques contra ti tienen ventaja hasta tu siguiente turno.', {}),
        ft('Sentir el peligro', 'Bárbaro', 'Ventaja en salvaciones de Destreza contra efectos que puedas ver (trampas, conjuros).', {}),
        ft('Frenesí', 'Senda del Berserker', 'Mientras estás en Furia, puedes hacer un ataque cuerpo a cuerpo extra como acción adicional en cada turno.', {}),
        ft('Constitución de piedra', 'Goliat', 'Como acción adicional ganas 1d12 + nivel de PG temporales. Descanso largo.', { usesMax: 1, recharge: 'long' }),
      ],
      languages: ['Común', 'Gigante'],
      armorProf: 'Armadura ligera y media, escudos',
      weaponProf: 'Armas simples y marciales',
      toolProf: 'Un juego de dados de hueso',
      journal: {
        personality: 'Cuenta a los enemigos antes de la pelea. En voz alta.',
        ideals: 'La palabra dada es un peso. No se suelta.',
        bonds: 'El Segundo de Piedracorva cayó en el paso de Kettur. Él llegó tarde.',
        flaws: 'No sabe retirarse. Nunca ha sabido.',
        backstory: 'Bajó de las montañas para servir de escolta y acabó en un regimiento. Cuando lo aniquilaron, siguió peleando solo hasta que unos aventureros lo recogieron medio muerto.',
        allies: 'La clériga Sor Maren le cosió el costado y no le cobró.',
        notes: 'Busca al oficial que ordenó el avance en Kettur.',
      },
    }),
    build('Nyx', 'Pícaro', 3, {
      slug: 'nyx',
      species: 'Tiefling',
      background: 'Criminal',
      subclass: 'Ladrón',
      tagline: 'Nunca la viste entrar',
      abilities: { str: 10, dex: 17, con: 13, int: 13, wis: 12, cha: 14 },
      skills: ['stealth', 'sleightOfHand', 'deception', 'perception', 'acrobatics', 'investigation'],
      ac: 14,
      hp: 21,
      attacks: [
        wp('Estoque', 'dex', '1d8', 'Perforante', { mastery: 'Sajar', notes: 'Sutil.' }),
        wp('Daga arrojadiza', 'dex', '1d4', 'Perforante', { range: 'Cuerpo a cuerpo o 6/18 m', mastery: 'Sajar' }),
        wp('Arco corto', 'dex', '1d6', 'Perforante', { range: '24/96 m', mastery: 'Verter' }),
      ],
      spellNotes: 'Sin lanzamiento de conjuros. El truco de Taumaturgia viene del linaje infernal (1/día).',
      coins: { gp: 60, pp: 3 },
      items: [
        it('Estoque', { equipped: true, weight: 1 }),
        it('Daga', { quantity: 4, weight: 0.5, notes: 'Dos al cinto, una en la bota, una en la manga.' }),
        it('Arco corto y 20 flechas', { weight: 1 }),
        it('Armadura de cuero', { equipped: true, weight: 4.5 }),
        it('Herramientas de ladrón', { equipped: true, notes: 'Competencia; ganzúas, espejo, limas.' }),
        it('Kit de disfraz', { weight: 1.5 }),
        it('Cuerda de seda (15 m)', { weight: 2.5 }),
        it('Sello de cera falsificado', { notes: 'Casa Verrin. Sirve para una carta, no para dos.' }),
      ],
      features: [
        ft('Ataque furtivo (2d6)', 'Pícaro', 'Una vez por turno, +2d6 de daño a un ataque con ventaja o con un aliado adyacente al objetivo, usando un arma sutil o a distancia.', {}),
        ft('Pericia', 'Pícaro', 'Competencia doble en Sigilo y Juego de manos.', {}),
        ft('Acción astuta', 'Pícaro', 'Cada turno puedes Correr, Retirarte o Esconderte como acción adicional.', {}),
        ft('Argot de ladrones', 'Pícaro', 'Jerga cifrada que solo entienden otros que la conozcan.', {}),
        ft('Robo veloz', 'Ladrón', 'Puedes usar herramientas de ladrón o robar un objeto como parte de la acción adicional de Acción astuta.', {}),
        ft('Manos rápidas', 'Ladrón', 'Usar un objeto como acción adicional.', {}),
        ft('Legado infernal', 'Tiefling', 'Resistencia al fuego. Conoces Taumaturgia; a nivel 3, Reprensión infernal 1/día.', { usesMax: 1, recharge: 'long' }),
      ],
      languages: ['Común', 'Infernal', 'Infracomún', 'Jerga de ladrones'],
      armorProf: 'Armadura ligera',
      weaponProf: 'Armas simples, ballestas de mano, espadas largas, estoques, espadas cortas',
      toolProf: 'Herramientas de ladrón, kit de disfraz',
      journal: {
        personality: 'Responde a las preguntas con otra pregunta.',
        ideals: 'Los cerrojos son una opinión, no una ley.',
        bonds: 'Le debe la vida a un carterista viejo que ya no puede trabajar. Le manda dinero.',
        flaws: 'No puede dejar pasar una caja fuerte cerrada.',
        backstory: 'Creció en los tejados del Barrio de la Sal. El gremio la quiso; ella prefirió trabajar por libre y aún lo está pagando.',
        allies: 'Corvo, el viejo carterista. Un contacto en la aduana que le avisa de las redadas.',
        notes: 'La Casa Verrin puso precio a su cabeza tras el asunto del collar.',
      },
    }),
    build('Sor Maren', 'Clérigo', 3, {
      slug: 'maren',
      species: 'Aasimar',
      background: 'Acólito',
      subclass: 'Dominio de la Vida',
      tagline: 'La luz no pide permiso',
      abilities: { str: 13, dex: 10, con: 14, int: 11, wis: 17, cha: 13 },
      skills: ['insight', 'medicine', 'religion', 'persuasion'],
      ac: 18,
      hp: 24,
      hpCurrent: 24,
      slotsUsed: { 1: 1 },
      attacks: [
        wp('Maza', 'str', '1d6', 'Contundente', { mastery: 'Aturdir' }),
        wp('Ballesta ligera', 'dex', '1d8', 'Perforante', { range: '24/96 m', mastery: 'Ralentizar' }),
        wp('Llama sagrada', 'wis', '2d8', 'Radiante', {
          range: '18 m',
          mastery: '—',
          notes: 'Truco. Salvación de Destreza, sin cobertura.',
        }),
      ],
      spells: [
        sp('Llama sagrada', 0, 'Evocación', { range: '18 m', description: 'Salvación de Destreza o 2d8 de radiante. Ignora la cobertura.' }),
        sp('Taumaturgia', 0, 'Transmutación', { range: '9 m', duration: 'Hasta 1 min', description: 'Voz atronadora, temblores leves, puertas que se abren solas.' }),
        sp('Orientación', 0, 'Adivinación', { concentration: true, duration: 'Conc., 1 min', description: '+1d4 a una prueba de característica del objetivo.' }),
        sp('Curar heridas', 1, 'Abjuración', { description: 'Cura 2d8 + mod. de lanzamiento (con Discípulo de la vida, +2 extra).' }),
        sp('Bendición', 1, 'Encantamiento', { components: 'V, S, M', concentration: true, duration: 'Conc., 1 min', description: 'Hasta tres criaturas suman 1d4 a tiradas de ataque y salvaciones.' }),
        sp('Escudo de la fe', 1, 'Abjuración', { castingTime: '1 acción adicional', range: '18 m', concentration: true, duration: 'Conc., 10 min', prepared: false, description: '+2 a la CA del objetivo.' }),
        sp('Arma espiritual', 2, 'Evocación', { castingTime: '1 acción adicional', range: '18 m', duration: '1 min', description: 'Arma espectral: 1d8 + mod. de fuerza radiante; la mueves y atacas como acción adicional.' }),
        sp('Restablecimiento menor', 2, 'Abjuración', { description: 'Cura una enfermedad o un estado: cegado, ensordecido, paralizado o envenenado.' }),
        sp('Ayuda', 2, 'Abjuración', { range: '9 m', duration: '8 horas', description: 'Tres criaturas suben su PG máximo y actual en 5. Siempre preparada (dominio).' }),
      ],
      spellNotes: 'Prepara 7 conjuros/día (SAB +3, nivel 3). Los del Dominio de la Vida están siempre preparados.',
      coins: { gp: 18 },
      items: [
        it('Maza', { equipped: true, weight: 2 }),
        it('Escudo', { equipped: true, weight: 3, notes: '+2 CA (ya incluido).' }),
        it('Cota de malla', { equipped: true, weight: 27.5 }),
        it('Símbolo sagrado', { equipped: true, notes: 'Sol de peltre. Foco de lanzamiento.' }),
        it('Kit de sanador', { notes: '10 usos. Estabiliza sin tirada.' }),
        it('Agua bendita (vial)', { quantity: 2 }),
        it('Vestiduras de acólito', {}),
        it('Raciones', { quantity: 7, weight: 1 }),
      ],
      features: [
        ft('Canalizar divinidad', 'Clérigo', 'Dos usos por descanso. Alimenta Expulsar muertos vivientes y Preservar la vida.', { usesMax: 2, recharge: 'short' }),
        ft('Expulsar muertos vivientes', 'Clérigo', 'Cada muerto viviente a 9 m debe superar una salvación de Sabiduría o huir 1 minuto.', {}),
        ft('Preservar la vida', 'Dominio de la Vida', 'Gastas Canalizar divinidad para repartir 5 × nivel de PG entre criaturas a 9 m, hasta la mitad de su máximo.', {}),
        ft('Discípulo de la vida', 'Dominio de la Vida', 'Tus conjuros de curación de nivel 1+ sanan 2 + el nivel del conjuro de PG extra.', {}),
        ft('Radiante celestial', 'Aasimar', 'Como acción adicional, transformación 1/descanso largo: alas o estallido radiante, y +daño radiante.', { usesMax: 1, recharge: 'long' }),
      ],
      languages: ['Común', 'Celestial'],
      armorProf: 'Armadura ligera y media, escudos',
      weaponProf: 'Armas simples',
      toolProf: 'Ninguna',
      journal: {
        personality: 'Escucha entero antes de responder. Siempre.',
        ideals: 'Nadie se queda atrás por lo que cuesta salvarlo.',
        bonds: 'El templo de Elyon la crió. Volverá cuando termine esto.',
        flaws: 'Se cree responsable de heridas que no podía haber evitado.',
        backstory: 'Dejada de niña en las escaleras de un templo, creció entre enfermos y moribundos. La marca celestial le salió a los quince y con ella la certeza de que no era para quedarse en casa.',
        allies: 'El hermano Tobin, que le manda cartas. Brann, que le debe un costado.',
        notes: 'Una fiebre recorre las aldeas del río Verde y no responde a la magia.',
      },
    }),
  ]
}

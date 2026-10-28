import { shortTextLabelsPt } from "./pt-short-text-labels.ts";

type ValueLabels = Readonly<Record<string, string>>;

/** The Fonte's Impecável and Tier 0 to 4 as letter tiers, S on top. */
const overallRatingPt: ValueLabels = {
  FLAWLESS: "S",
  TIER_0: "A+",
  TIER_1: "A",
  TIER_2: "B",
  TIER_3: "C",
  TIER_4: "D",
  UNRATED: "Sem nota",
};

const connectionPt: ValueLabels = {
  유선: "Com fio",
  무선: "Sem fio",
  유무선: "Com e sem fio",
};

const switchMechanismPt: ValueLabels = {
  광축: "Óptico",
  기계식: "Mecânico",
  멤브레인: "Membrana",
  무접점: "Capacitivo",
  자석축: "Magnético",
};

const noneConfirmedPt = "Não tem";

/**
 * Portuguese label per field key and raw Fonte value, for ENUM values and
 * for the repeated short texts in Korean. Fields whose values are proper names
 * or numbers (sensor, MCU, polling rate) have no entry: their `en` label reads
 * the same in Portuguese.
 */
export const valueLabelsPt: Readonly<Record<string, ValueLabels>> = {
  status: {
    unreleased: "Não lançado",
    proposed: "Sugerido",
    purchased: "Comprado",
    arrived: "Recebido",
    testing: "Em teste",
    earlyAccess: "Prévia",
    reviewed: "Publicado",
  },
  driverSupportStatus: {
    notAvailable: "Sem software oficial",
    notRequired: "Não precisa de software",
  },
  saleStatus: {
    unreleased: "Não lançado",
    FOR_SALE: "À venda",
    DISCONTINUED: "Descontinuado",
  },
  // One word each, read after the column name: "Recomendação: Boa".
  eyejokerRating: {
    ANTICIPATING: "Pendente",
    HIGHLY_RECOMMENDED: "Ótima",
    RECOMMENDED: "Boa",
    MILD_RECOMMENDATION: "Fraca",
    NO_RECOMMENDATION: "Evitar",
  },
  overallRatingMouse: overallRatingPt,
  overallRatingKeyboard: overallRatingPt,
  overallRatingMonitor: overallRatingPt,

  housingMouse: { 대칭: "Simétrico", 비대칭: "Assimétrico" },
  mouseConnection: connectionPt,
  mouseMaterial: {
    POLYMER: "Plástico",
    MAGNESIUM_ALLOY: "Liga de magnésio",
    ALUMINUM: "Alumínio",
    CARBON_FIBER: "Fibra de carbono",
    COMPOSITE: "Compósito",
    OTHER: "Outro",
  },
  holeBody: {
    yes: "Sim",
    no: "Não",
    yesBottom: "Só embaixo",
    yesModel: "Depende do modelo",
  },
  port: {
    usbTypeC: "USB-C",
    일체형: "Cabo fixo",
    microusb: "Micro USB",
    배터리: "Bateria",
    마그네틱: "Magnético",
  },
  sensorLodMode: { single: "Valor fixo", options: "Valores selecionáveis", range: "Faixa" },
  // The Fonte writes these in English with decimal points; the most common ones read as pt here.
  sensorLodOptions: {
    "1.0, 2.0 mm": "1,0 mm e 2,0 mm",
    "0.7, 1.0, 2.0 mm": "0,7 mm, 1,0 mm e 2,0 mm",
    "0.7~1.7 mm (11 steps)": "0,7 a 1,7 mm (11 níveis)",
    "0.7~1.7 mm (0.1 mm step, 11 levels)": "0,7 a 1,7 mm (11 níveis, de 0,1 em 0,1 mm)",
    "0.7 / 1.0 / 2.0mm": "0,7 mm, 1,0 mm e 2,0 mm",
    "0.7~1.7 mm (0.1 mm step)": "0,7 a 1,7 mm (de 0,1 em 0,1 mm)",
    "low, high": "Baixo e alto",
    "0.7, 0.9, 1.2, 1.4, 1.6 mm": "0,7 mm, 0,9 mm, 1,2 mm, 1,4 mm e 1,6 mm",
    "0.7~1.7 mm": "0,7 a 1,7 mm",
  },
  // The Fonte names the side switches by raw ids; the others read as words through labels.ts.
  sideSwitch: {
    noneOrUnknownSideSwitch: "Nenhum ou desconhecido",
    twoPinMicroSwitch: "Micro switch de 2 pinos",
    unknownMakerThreePinSwitch: "Switch de 3 pinos (marca desconhecida)",
    unknownMaybeHuanle: "Desconhecido (talvez Huanle)",
    // Part numbers and one-word brands, which a split at each capital would garble.
    omronD2fcF7n10m: "Omron D2FC-F-7N (10M)",
    omronD2fcF7n20m: "Omron D2FC-F-7N (20M)",
    kailhGm20: "Kailh GM 2.0",
    huano: "Huano",
    kailh: "Kailh",
  },
  encoder: { kailhDustproofRed11mm: "Kailh Dustproof Red 11 mm" },
  // The Fonte's "X" on a mouse with no battery, almost always a wired one.
  battery: { X: "Sem bateria" },

  connectionType: connectionPt,
  keyboardLayout: {
    "60%": "60%",
    "65%": "65%",
    "75%": "75%",
    "96%": "96%",
    etc: "Outro",
    full: "Completo",
    tkl: "TKL",
  },
  keyboardMechanism: switchMechanismPt,
  measuredSwitchType: switchMechanismPt,
  profile: {
    cherryProfile: "Perfil Cherry",
    lowProfile: "Perfil baixo",
    oemProfile: "Perfil OEM",
  },
  led: { false: "Não", part: "Parcial", rgb: "RGB", true: "Sim" },
  housingKeyboard: {
    aluminum: "Alumínio",
    custom: "Personalizada",
    mixed: "Mista",
    other: "Outro",
    plastic: "Plástico",
  },
  mounting: {
    bottom: "Bottom mount",
    gasket: "Gasket",
    leafspring: "Leaf spring",
    oring: "O-ring",
    sandwitch: "Sanduíche",
    top: "Top mount",
    tray: "Tray mount",
  },
  connectionOption: {
    Battery: "Bateria",
    fixedCable: "Cabo fixo",
    ps2: "PS/2",
    usbMicroB: "Micro-USB",
    usbMiniB: "Mini-USB",
    usbTypeC: "USB-C",
  },
  keycap: {
    absDoubleShot: "ABS double-shot",
    pbtDoubleShot: "PBT double-shot",
    pbtDyeSub: "PBT dye-sub",
  },
  solution: { "자체 솔루션": "Própria", etc: "Outra" },
  stabilizer: {
    cherryPcbMount: "Cherry, preso na placa",
    cherryPlateMount: "Cherry, preso na plate",
    cherryPlatePcbMount: "Cherry, preso na plate e na placa",
    hybridPlateMount: "Híbrido, preso na plate",
  },

  adaptiveSync: {
    gsync: "G-SYNC",
    freesync: "FreeSync",
    none: "Nenhuma",
    gsyncPulsar: "G-SYNC Pulsar",
    gsyncCompatible: "Compatível com G-SYNC",
    freeSyncPremiumPro: "FreeSync Premium Pro",
    freeSyncPremium: "FreeSync Premium",
    gSyncUltimate: "G-SYNC Ultimate",
    gsyncCompatibleVerify: "Compatível com G-SYNC (certificado)",
  },
  displayStreamCompression: {
    noneConfirmed: noneConfirmedPt,
    supported: "Suportado",
    requiredForMaxMode: "Necessário no modo máximo",
    modeDependent: "Depende do modo",
  },
  kvmType: {
    noneConfirmed: noneConfirmedPt,
    usbBPlusUsbC: "KVM USB-B + USB-C",
    dualUsbC: "KVM com dois USB-C",
    thunderboltKvm: "KVM Thunderbolt",
    manualUsbSwitch: "Troca manual de USB",
    unknownTopology: "KVM sem ligação confirmada",
  },
  audioReturnChannel: { arc: "ARC", earc: "eARC", noneConfirmed: noneConfirmedPt },
  multiViewSupport: { pbp: "PbP", pip: "PiP", quadPbp: "PbP em 4", noneConfirmed: noneConfirmedPt },
  localDimmingType: {
    globalDimming: "Escurecimento global",
    edgeLocalDimming: "Escurecimento local nas bordas",
    fald: "FALD",
    miniLed: "Mini LED",
  },
  standType: {
    included: "Suporte incluso",
    notIncluded: "Sem suporte",
    optional: "Suporte vendido à parte",
    armOnly: "Só braço articulado",
  },
  standAdjustments: {
    tilt: "Inclinação",
    height: "Altura",
    swivel: "Giro lateral",
    pivot: "Pivô",
    rotationBothWays: "Pivô nos dois sentidos",
    cableManagement: "Organizador de cabos",
  },
  vesaMountPattern: {
    noneConfirmed: noneConfirmedPt,
    vesa75x75: "75×75",
    vesa100x100: "100×100",
    vesa200x100: "200×100",
    vesa200x200: "200×200",
    adapterRequired: "Precisa de adaptador",
    custom: "Padrão próprio",
  },
  screenCoating: {
    glossy: "Brilhante",
    semiGlossy: "Semibrilhante",
    semiMatte: "Semifosco",
    matteAntiGlare: "Fosco antirreflexo",
    heavyMatteAntiGlare: "Fosco antirreflexo forte",
    etchedGlass: "Vidro gravado",
    antiReflection: "Antirreflexo",
    nonglare: "Antiofuscante",
  },
  vrrFlickerGrade: { none: "Quase nenhuma", minor: "Leve", moderate: "Moderada", severe: "Forte" },
  textClarityGrade: { excellent: "Excelente", good: "Boa", fair: "Regular", poor: "Ruim" },

  ...shortTextLabelsPt,
};

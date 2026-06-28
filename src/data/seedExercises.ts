import type { Exercise, ExerciseMedia, ExerciseType } from "../domain/types";
import { normalizeExerciseName, toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";

export const EXERCISE_LIBRARY_SEED_META_ID = "seed:exercise-library:1";

type SeedExerciseInput = Pick<
  Exercise,
  "name" | "primaryMuscles" | "secondaryMuscles" | "equipment" | "tags" | "guide"
> & {
  type?: ExerciseType;
  weightRelevant?: boolean;
};

type DatasetMediaInput = Pick<ExerciseMedia, "sourceExerciseId" | "sourceExerciseName"> & {
  imagePath: string;
  animationPath: string;
};

const EXERCISES_DATASET_COMMIT = "cb611259f71f9dedaf908254d56d6e1fb0576054";
const EXERCISES_DATASET_ASSET_BASE_URL = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${EXERCISES_DATASET_COMMIT}`;
const EXERCISES_DATASET_SOURCE_URL = `https://github.com/hasaneyldrm/exercises-dataset/tree/${EXERCISES_DATASET_COMMIT}`;

const datasetMediaByExerciseName: Record<string, DatasetMediaInput> = {
  Sentadilla: datasetMedia(
    "0043",
    "barbell full squat",
    "images/0043-qXTaZnJ.jpg",
    "videos/0043-qXTaZnJ.gif",
  ),
  "Press banca": datasetMedia(
    "0025",
    "barbell bench press",
    "images/0025-EIeI8Vf.jpg",
    "videos/0025-EIeI8Vf.gif",
  ),
  "Remo con barra": datasetMedia(
    "0027",
    "barbell bent over row",
    "images/0027-eZyBC3j.jpg",
    "videos/0027-eZyBC3j.gif",
  ),
  "Peso muerto rumano": datasetMedia(
    "0085",
    "barbell romanian deadlift",
    "images/0085-wQ2c4XD.jpg",
    "videos/0085-wQ2c4XD.gif",
  ),
  Zancadas: datasetMedia(
    "0336",
    "dumbbell lunge",
    "images/0336-RRWFUcw.jpg",
    "videos/0336-RRWFUcw.gif",
  ),
  "Press militar": datasetMedia(
    "1457",
    "barbell standing wide military press",
    "images/1457-Kyd9Rz5.jpg",
    "videos/1457-Kyd9Rz5.gif",
  ),
  "Sentadilla goblet": datasetMedia(
    "1760",
    "dumbbell goblet squat",
    "images/1760-yn8yg1r.jpg",
    "videos/1760-yn8yg1r.gif",
  ),
  "Step-up": datasetMedia(
    "0431",
    "dumbbell step-up",
    "images/0431-aXtJhlg.jpg",
    "videos/0431-aXtJhlg.gif",
  ),
  "Prensa de pierna": datasetMedia(
    "1463",
    "sled 45° leg press (side pov)",
    "images/1463-2Qh2J1e.jpg",
    "videos/1463-2Qh2J1e.gif",
  ),
  "Curl femoral en máquina": datasetMedia(
    "0599",
    "lever seated leg curl",
    "images/0599-Zg3XY7P.jpg",
    "videos/0599-Zg3XY7P.gif",
  ),
  "Extensión de piernas": datasetMedia(
    "0585",
    "lever leg extension",
    "images/0585-my33uHU.jpg",
    "videos/0585-my33uHU.gif",
  ),
  "Hip thrust": datasetMedia(
    "3562",
    "barbell glute bridge two legs on bench (male)",
    "images/3562-qg2PGl6.jpg",
    "videos/3562-qg2PGl6.gif",
  ),
  "Puente de glúteos": datasetMedia(
    "3013",
    "low glute bridge on floor",
    "images/3013-u0cNiij.jpg",
    "videos/3013-u0cNiij.gif",
  ),
  "Elevación de pantorrillas": datasetMedia(
    "0417",
    "dumbbell standing calf raise",
    "images/0417-dPmaUaU.jpg",
    "videos/0417-dPmaUaU.gif",
  ),
  Flexiones: datasetMedia(
    "0662",
    "push-up",
    "images/0662-I4hDWkc.jpg",
    "videos/0662-I4hDWkc.gif",
  ),
  "Press inclinado con mancuernas": datasetMedia(
    "0314",
    "dumbbell incline bench press",
    "images/0314-ns0SIbU.jpg",
    "videos/0314-ns0SIbU.gif",
  ),
  "Aperturas con mancuernas": datasetMedia(
    "0308",
    "dumbbell fly",
    "images/0308-yz9nUhF.jpg",
    "videos/0308-yz9nUhF.gif",
  ),
  "Jalón al pecho": datasetMedia(
    "2330",
    "cable lat pulldown full range of motion",
    "images/2330-LEprlgG.jpg",
    "videos/2330-LEprlgG.gif",
  ),
  "Dominadas asistidas": datasetMedia(
    "0017",
    "assisted pull-up",
    "images/0017-kiJ4Z2K.jpg",
    "videos/0017-kiJ4Z2K.gif",
  ),
  "Remo con mancuerna": datasetMedia(
    "0293",
    "dumbbell bent over row",
    "images/0293-BJ0Hz5L.jpg",
    "videos/0293-BJ0Hz5L.gif",
  ),
  "Remo invertido": datasetMedia(
    "0499",
    "inverted row",
    "images/0499-bZGHsAZ.jpg",
    "videos/0499-bZGHsAZ.gif",
  ),
  "Remo sentado en polea": datasetMedia(
    "0861",
    "cable seated row",
    "images/0861-fUBheHs.jpg",
    "videos/0861-fUBheHs.gif",
  ),
  "Elevaciones laterales": datasetMedia(
    "0334",
    "dumbbell lateral raise",
    "images/0334-DsgkuIt.jpg",
    "videos/0334-DsgkuIt.gif",
  ),
  "Curl de bíceps": datasetMedia(
    "0294",
    "dumbbell biceps curl",
    "images/0294-NbVPDMW.jpg",
    "videos/0294-NbVPDMW.gif",
  ),
  "Extensión de tríceps en polea": datasetMedia(
    "0241",
    "cable triceps pushdown (v-bar)",
    "images/0241-gAwDzB3.jpg",
    "videos/0241-gAwDzB3.gif",
  ),
  "Fondos en banco": datasetMedia(
    "0129",
    "bench dip (knees bent)",
    "images/0129-RrLske5.jpg",
    "videos/0129-RrLske5.gif",
  ),
  "Dead bug": datasetMedia(
    "0276",
    "dead bug",
    "images/0276-iny3m5y.jpg",
    "videos/0276-iny3m5y.gif",
  ),
  "Pallof press": datasetMedia(
    "0979",
    "band horizontal pallof press",
    "images/0979-9pa4H5m.jpg",
    "videos/0979-9pa4H5m.gif",
  ),
  "Farmer carry": datasetMedia(
    "2133",
    "farmers walk",
    "images/2133-qPEzJjA.jpg",
    "videos/2133-qPEzJjA.gif",
  ),
  "Kettlebell swing": datasetMedia(
    "0549",
    "kettlebell swing",
    "images/0549-UHJlbu3.jpg",
    "videos/0549-UHJlbu3.gif",
  ),
  "Press de pecho en máquina": datasetMedia(
    "0577",
    "lever chest press",
    "images/0577-T0yTjgW.jpg",
    "videos/0577-T0yTjgW.gif",
  ),
  "Press con mancuernas en banca plana": datasetMedia(
    "0289",
    "dumbbell bench press",
    "images/0289-SpYC0Kp.jpg",
    "videos/0289-SpYC0Kp.gif",
  ),
  "Press de hombro en máquina": datasetMedia(
    "0603",
    "lever shoulder press",
    "images/0603-67n3r98.jpg",
    "videos/0603-67n3r98.gif",
  ),
  "Remo con banda": datasetMedia(
    "0988",
    "band one arm standing low row",
    "images/0988-km0sQC0.jpg",
    "videos/0988-km0sQC0.gif",
  ),
  "Split squat": datasetMedia(
    "2368",
    "split squats",
    "images/2368-9E25EOx.jpg",
    "videos/2368-9E25EOx.gif",
  ),
  "Plancha lateral": datasetMedia(
    "3544",
    "bodyweight incline side plank",
    "images/3544-5VXmnV5.jpg",
    "videos/3544-5VXmnV5.gif",
  ),
  "Crunch en polea": datasetMedia(
    "0175",
    "cable kneeling crunch",
    "images/0175-WW95auq.jpg",
    "videos/0175-WW95auq.gif",
  ),
  "Abducción de cadera en máquina": datasetMedia(
    "0597",
    "lever seated hip abduction",
    "images/0597-CHpahtl.jpg",
    "videos/0597-CHpahtl.gif",
  ),
  "Curl martillo": datasetMedia(
    "0313",
    "dumbbell hammer curl",
    "images/0313-slDvUAU.jpg",
    "videos/0313-slDvUAU.gif",
  ),
  "Sentadilla hack": datasetMedia(
    "0743",
    "sled hack squat",
    "images/0743-Qa55kX1.jpg",
    "videos/0743-Qa55kX1.gif",
  ),
  "Aducción de cadera en máquina": datasetMedia(
    "0598",
    "lever seated hip adduction",
    "images/0598-oHsrypV.jpg",
    "videos/0598-oHsrypV.gif",
  ),
  "Remo en máquina con pecho apoyado": datasetMedia(
    "0581",
    "lever high row",
    "images/0581-nZZZy9m.jpg",
    "videos/0581-nZZZy9m.gif",
  ),
  "Jalón con brazos rectos": datasetMedia(
    "0238",
    "cable straight arm pulldown",
    "images/0238-x69MAlq.jpg",
    "videos/0238-x69MAlq.gif",
  ),
  "Cruce de poleas": datasetMedia(
    "0155",
    "cable cross-over variation",
    "images/0155-0CXGHya.jpg",
    "videos/0155-0CXGHya.gif",
  ),
  "Patada de glúteo en polea": datasetMedia(
    "0228",
    "cable standing hip extension",
    "images/0228-Kpajagk.jpg",
    "videos/0228-Kpajagk.gif",
  ),
  "Aperturas inversas con mancuernas": datasetMedia(
    "0383",
    "dumbbell reverse fly",
    "images/0383-EAs3xL9.jpg",
    "videos/0383-EAs3xL9.gif",
  ),
  "Peso muerto a una pierna con mancuerna": datasetMedia(
    "1757",
    "dumbbell single leg deadlift",
    "images/1757-gKozT8X.jpg",
    "videos/1757-gKozT8X.gif",
  ),
  "Pullover con mancuerna": datasetMedia(
    "0375",
    "dumbbell pullover",
    "images/0375-9XjtHvS.jpg",
    "videos/0375-9XjtHvS.gif",
  ),
  "Elevación de piernas colgado": datasetMedia(
    "0472",
    "hanging leg raise",
    "images/0472-I3tsCnC.jpg",
    "videos/0472-I3tsCnC.gif",
  ),
  "Extensión de espalda en banco": datasetMedia(
    "0488",
    "hyperextension (on bench)",
    "images/0488-zkgRrbK.jpg",
    "videos/0488-zkgRrbK.gif",
  ),
};

const equipmentDetailsByExerciseName: Record<string, string> = {
  Sentadilla: "Rack de sentadilla o jaula de potencia con barra olímpica.",
  "Press banca": "Banco plano con soportes para barra olímpica.",
  "Remo con barra": "Barra olímpica libre; opcional rack para elevar la barra al inicio.",
  "Peso muerto rumano": "Barra olímpica libre o par de mancuernas pesadas.",
  Zancadas: "Espacio libre con peso corporal o par de mancuernas.",
  "Press militar": "Rack con barra a altura de hombros o par de mancuernas.",
  "Sentadilla con peso corporal": "Espacio libre, sin máquina.",
  "Sentadilla goblet": "Mancuerna o kettlebell sostenida frente al pecho.",
  "Step-up": "Banco, cajón pliométrico o plataforma estable.",
  "Prensa de pierna": "Máquina de prensa de pierna inclinada u horizontal.",
  "Curl femoral en máquina": "Máquina de curl femoral acostado o sentado.",
  "Extensión de piernas": "Máquina de extensión de piernas con rodillo frontal.",
  "Hip thrust": "Banco estable con barra y almohadilla; máquina de hip thrust si existe.",
  "Puente de glúteos": "Colchoneta o piso; opcional mancuerna sobre la cadera.",
  "Elevación de pantorrillas":
    "Máquina de pantorrilla de pie o sentado; alternativa con mancuernas.",
  Flexiones: "Piso o colchoneta, sin máquina.",
  "Press inclinado con mancuernas": "Banco ajustable inclinado y par de mancuernas.",
  "Aperturas con mancuernas": "Banco plano o inclinado y par de mancuernas ligeras.",
  "Jalón al pecho": "Máquina de jalón al pecho con polea alta y soporte para muslos.",
  "Dominadas asistidas": "Máquina de dominadas asistidas; alternativa banda en barra fija.",
  "Remo con mancuerna": "Banco plano y una mancuerna.",
  "Remo invertido": "Barra fija baja en rack o Smith machine bloqueada.",
  "Remo sentado en polea": "Máquina de remo sentado con polea baja.",
  "Face pull": "Polea alta o media con cuerda; alternativa banda anclada.",
  "Elevaciones laterales": "Par de mancuernas; alternativa polea baja o banda.",
  "Curl de bíceps": "Par de mancuernas, barra recta/EZ o polea baja.",
  "Extensión de tríceps en polea": "Polea alta con cuerda o barra recta.",
  "Fondos en banco": "Banco plano estable, sin máquina.",
  Plancha: "Piso o colchoneta, sin máquina.",
  "Dead bug": "Piso o colchoneta, sin máquina.",
  "Pallof press": "Polea ajustable a altura del pecho o banda anclada.",
  "Farmer carry": "Par de mancuernas o kettlebells con espacio para caminar.",
  "Kettlebell swing": "Kettlebell y espacio libre delante del cuerpo.",
  "Press de pecho en máquina": "Máquina de press de pecho sentado con respaldo.",
  "Press con mancuernas en banca plana": "Banco plano y par de mancuernas.",
  "Press de hombro en máquina": "Máquina de press de hombro sentado con respaldo.",
  "Remo con banda": "Banda de resistencia anclada a un punto estable.",
  "Split squat": "Espacio libre; opcional par de mancuernas.",
  "Peso muerto con kettlebell": "Kettlebell o mancuerna colocada entre los pies.",
  "Plancha lateral": "Piso o colchoneta, sin máquina.",
  "Crunch en polea": "Polea alta con cuerda, de rodillas frente a la torre.",
  "Abducción de cadera en máquina": "Máquina de abducción de cadera sentado.",
  "Curl martillo": "Par de mancuernas con agarre neutral.",
  "Sentadilla hack": "Máquina hack squat con plataforma y respaldo inclinado.",
  "Aducción de cadera en máquina": "Máquina de aducción de cadera sentado.",
  "Remo en máquina con pecho apoyado": "Máquina de remo con soporte para pecho y agarres.",
  "Jalón con brazos rectos": "Polea alta con barra recta o cuerda.",
  "Cruce de poleas": "Dos poleas ajustables con agarres individuales.",
  "Patada de glúteo en polea": "Polea baja con tobillera.",
  "Aperturas inversas con mancuernas": "Par de mancuernas ligeras; opcional banca inclinada.",
  "Peso muerto a una pierna con mancuerna": "Una o dos mancuernas y espacio libre.",
  "Pullover con mancuerna": "Banco plano y una mancuerna.",
  "Bird dog": "Piso o colchoneta, sin máquina.",
  "Elevación de piernas colgado": "Barra fija o silla romana.",
  "Extensión de espalda en banco": "Banco romano o banco de hiperextensiones.",
};

const seedExerciseInputs: SeedExerciseInput[] = [
  {
    name: "Sentadilla",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["barra", "rack"],
    tags: ["fuerza", "pierna", "compuesto"],
    guide: {
      setup: ["Coloca la barra estable sobre la espalda alta.", "Pies al ancho de hombros."],
      technique: ["Baja con control manteniendo el torso firme.", "Empuja el piso para subir."],
      commonMistakes: ["Rodillas colapsando hacia adentro.", "Perder tensión en el core."],
    },
  },
  {
    name: "Press banca",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["tríceps", "hombro anterior"],
    equipment: ["barra", "banca"],
    tags: ["fuerza", "empuje", "compuesto"],
    guide: {
      setup: ["Apoya pies firmes en el piso.", "Junta escápulas antes de sacar la barra."],
      technique: ["Baja la barra con trayectoria controlada.", "Empuja sin perder estabilidad."],
      commonMistakes: ["Rebotar la barra en el pecho.", "Levantar la cadera de la banca."],
    },
  },
  {
    name: "Remo con barra",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "core"],
    equipment: ["barra"],
    tags: ["tirón", "espalda", "compuesto"],
    guide: {
      setup: ["Inclina el torso con espalda neutra.", "Toma la barra con agarre firme."],
      technique: ["Lleva la barra hacia el torso.", "Controla la bajada sin redondear espalda."],
      commonMistakes: ["Usar impulso excesivo.", "Elevar el torso en cada repetición."],
    },
  },
  {
    name: "Peso muerto rumano",
    primaryMuscles: ["isquiotibiales", "glúteos"],
    secondaryMuscles: ["espalda baja", "core"],
    equipment: ["barra", "mancuernas"],
    tags: ["bisagra", "pierna", "posterior"],
    guide: {
      setup: ["Empieza de pie con la carga cerca del cuerpo.", "Flexiona ligeramente rodillas."],
      technique: ["Lleva la cadera hacia atrás.", "Sube apretando glúteos sin hiperextender."],
      commonMistakes: ["Convertirlo en sentadilla.", "Alejar la carga del cuerpo."],
    },
  },
  {
    name: "Zancadas",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["peso corporal", "mancuernas"],
    tags: ["unilateral", "pierna"],
    guide: {
      setup: ["Da un paso estable hacia adelante o atrás.", "Mantén mirada al frente."],
      technique: ["Baja hasta una profundidad controlada.", "Empuja con la pierna principal."],
      commonMistakes: ["Paso demasiado corto.", "Perder equilibrio por ir demasiado rápido."],
    },
  },
  {
    name: "Press militar",
    primaryMuscles: ["hombros"],
    secondaryMuscles: ["tríceps", "core"],
    equipment: ["barra", "mancuernas"],
    tags: ["empuje", "tren superior", "compuesto"],
    guide: {
      setup: ["Coloca la carga a la altura de hombros.", "Aprieta glúteos y abdomen."],
      technique: ["Empuja verticalmente sin arquear la espalda.", "Bloquea arriba con control."],
      commonMistakes: ["Inclinarse hacia atrás.", "Perder tensión del abdomen."],
    },
  },
  {
    name: "Sentadilla con peso corporal",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["core"],
    equipment: ["peso corporal"],
    tags: ["sentadilla", "pierna", "principiante", "sin máquinas"],
    weightRelevant: false,
    guide: {
      setup: ["Pies al ancho de hombros.", "Mantén el torso estable."],
      technique: ["Baja con control hasta un rango cómodo.", "Sube empujando el piso."],
      commonMistakes: ["Levantar los talones.", "Colapsar rodillas hacia adentro."],
    },
  },
  {
    name: "Sentadilla goblet",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["core", "espalda alta"],
    equipment: ["mancuerna", "kettlebell"],
    tags: ["sentadilla", "pierna", "principiante", "compuesto"],
    guide: {
      setup: ["Sostén la carga frente al pecho.", "Pies al ancho de hombros."],
      technique: ["Baja con control manteniendo el pecho alto.", "Sube empujando el piso."],
      commonMistakes: ["Redondear la espalda.", "Dejar que los talones se levanten."],
    },
  },
  {
    name: "Step-up",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["banco", "caja", "mancuernas"],
    tags: ["unilateral", "pierna", "funcional"],
    guide: {
      setup: ["Coloca un pie completo sobre el banco.", "Mantén el torso estable."],
      technique: ["Sube empujando con la pierna de arriba.", "Baja lento sin caer."],
      commonMistakes: [
        "Impulsarse demasiado con la pierna de abajo.",
        "Perder alineación de rodilla.",
      ],
    },
  },
  {
    name: "Prensa de pierna",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales"],
    equipment: ["máquina"],
    tags: ["pierna", "máquina", "hipertrofia"],
    guide: {
      setup: ["Apoya la espalda completa en el respaldo.", "Coloca pies firmes en la plataforma."],
      technique: [
        "Baja con rango controlado.",
        "Empuja sin bloquear agresivamente las rodillas.",
      ],
      commonMistakes: ["Bajar la carga perdiendo la pelvis.", "Usar un rango demasiado corto."],
    },
  },
  {
    name: "Curl femoral en máquina",
    primaryMuscles: ["isquiotibiales"],
    secondaryMuscles: ["pantorrillas"],
    equipment: ["máquina"],
    tags: ["posterior", "máquina", "aislamiento"],
    guide: {
      setup: [
        "Ajusta el rodillo cerca de los tobillos.",
        "Alinea la rodilla con el eje de la máquina.",
      ],
      technique: ["Flexiona rodillas con control.", "Regresa lento sin soltar la tensión."],
      commonMistakes: ["Levantar la cadera.", "Usar impulso al final del movimiento."],
    },
  },
  {
    name: "Extensión de piernas",
    primaryMuscles: ["cuádriceps"],
    secondaryMuscles: [],
    equipment: ["máquina"],
    tags: ["pierna", "máquina", "aislamiento"],
    guide: {
      setup: ["Ajusta el respaldo y el rodillo sobre los tobillos.", "Siéntate con la espalda apoyada."],
      technique: ["Extiende rodillas con control.", "Pausa breve arriba sin perder postura."],
      commonMistakes: ["Balancear el cuerpo.", "Bajar la carga demasiado rápido."],
    },
  },
  {
    name: "Hip thrust",
    primaryMuscles: ["glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["barra", "banca", "mancuerna"],
    tags: ["glúteos", "bisagra", "posterior"],
    guide: {
      setup: ["Apoya la espalda alta en la banca.", "Coloca pies firmes cerca de la cadera."],
      technique: [
        "Sube la cadera hasta alinear torso y muslos.",
        "Controla la bajada manteniendo costillas abajo.",
      ],
      commonMistakes: ["Hiperextender la espalda baja.", "Empujar desde las puntas de los pies."],
    },
  },
  {
    name: "Puente de glúteos",
    primaryMuscles: ["glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["peso corporal", "mancuerna"],
    tags: ["glúteos", "principiante", "posterior"],
    guide: {
      setup: ["Acuéstate con rodillas flexionadas.", "Pies firmes al ancho de cadera."],
      technique: ["Eleva la cadera apretando glúteos.", "Baja lento sin perder control."],
      commonMistakes: ["Arquear la espalda baja.", "Colocar los pies demasiado lejos."],
    },
  },
  {
    name: "Elevación de pantorrillas",
    primaryMuscles: ["pantorrillas"],
    secondaryMuscles: [],
    equipment: ["peso corporal", "mancuernas", "máquina"],
    tags: ["pierna", "aislamiento"],
    guide: {
      setup: ["Apoya la parte frontal del pie con estabilidad.", "Mantén rodillas controladas."],
      technique: ["Sube los talones con pausa arriba.", "Baja hasta sentir estiramiento cómodo."],
      commonMistakes: ["Rebotar rápido.", "Inclinar el cuerpo para hacer trampa."],
    },
  },
  {
    name: "Flexiones",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["tríceps", "hombro anterior", "core"],
    equipment: ["peso corporal"],
    tags: ["empuje", "tren superior", "sin máquinas"],
    guide: {
      setup: ["Manos bajo hombros o ligeramente más abiertas.", "Cuerpo en línea recta."],
      technique: [
        "Baja con codos controlados.",
        "Empuja el piso sin perder tensión del abdomen.",
      ],
      commonMistakes: ["Hundir la cadera.", "Abrir demasiado los codos."],
    },
  },
  {
    name: "Press inclinado con mancuernas",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["hombro anterior", "tríceps"],
    equipment: ["mancuernas", "banca"],
    tags: ["empuje", "tren superior", "hipertrofia"],
    guide: {
      setup: ["Inclina la banca moderadamente.", "Empieza con mancuernas sobre el pecho."],
      technique: [
        "Baja con control hacia los lados del pecho.",
        "Empuja manteniendo muñecas firmes.",
      ],
      commonMistakes: ["Chocar las mancuernas arriba.", "Arquear demasiado la espalda."],
    },
  },
  {
    name: "Aperturas con mancuernas",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["hombro anterior"],
    equipment: ["mancuernas", "banca"],
    tags: ["empuje", "aislamiento", "hipertrofia"],
    guide: {
      setup: ["Acuéstate con mancuernas sobre el pecho.", "Mantén codos ligeramente flexionados."],
      technique: [
        "Abre brazos con rango cómodo.",
        "Regresa apretando el pecho sin golpear mancuernas.",
      ],
      commonMistakes: ["Bajar demasiado profundo.", "Convertirlo en press."],
    },
  },
  {
    name: "Jalón al pecho",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "hombro posterior"],
    equipment: ["máquina", "polea"],
    tags: ["tirón", "espalda", "máquina"],
    guide: {
      setup: ["Ajusta el soporte sobre los muslos.", "Toma la barra con agarre firme."],
      technique: ["Tira hacia la parte alta del pecho.", "Sube controlando los hombros."],
      commonMistakes: ["Jalar detrás del cuello.", "Balancear el torso."],
    },
  },
  {
    name: "Dominadas asistidas",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "core"],
    equipment: ["máquina", "banda", "barra"],
    tags: ["tirón", "espalda", "sin máquinas"],
    guide: {
      setup: ["Elige asistencia que permita control.", "Cuelga con hombros activos."],
      technique: ["Sube llevando el pecho hacia la barra.", "Baja completo sin soltar tensión."],
      commonMistakes: ["Patear para subir.", "Cortar demasiado el rango."],
    },
  },
  {
    name: "Remo con mancuerna",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "core"],
    equipment: ["mancuerna", "banca"],
    tags: ["tirón", "espalda", "unilateral"],
    guide: {
      setup: ["Apoya una mano o rodilla en la banca.", "Mantén espalda neutra."],
      technique: ["Lleva la mancuerna hacia la cadera.", "Baja lento sin rotar el torso."],
      commonMistakes: ["Encoger el hombro.", "Girar el cuerpo para levantar más."],
    },
  },
  {
    name: "Remo invertido",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "core"],
    equipment: ["barra", "peso corporal"],
    tags: ["tirón", "espalda", "sin máquinas"],
    guide: {
      setup: ["Colócate bajo una barra estable.", "Mantén el cuerpo en línea recta."],
      technique: ["Jala el pecho hacia la barra.", "Baja controlando sin perder postura."],
      commonMistakes: ["Hundir la cadera.", "Acortar demasiado el recorrido."],
    },
  },
  {
    name: "Remo sentado en polea",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "hombro posterior"],
    equipment: ["polea", "máquina"],
    tags: ["tirón", "espalda", "máquina"],
    guide: {
      setup: ["Siéntate alto con pies apoyados.", "Toma el agarre sin redondear espalda."],
      technique: ["Jala hacia el torso.", "Regresa controlando la extensión de brazos."],
      commonMistakes: ["Balancearse hacia atrás.", "Perder postura al estirar."],
    },
  },
  {
    name: "Face pull",
    primaryMuscles: ["hombro posterior", "espalda alta"],
    secondaryMuscles: ["rotadores externos"],
    equipment: ["polea", "banda"],
    tags: ["tirón", "hombros", "accesorio"],
    guide: {
      setup: ["Coloca la polea a la altura de la cara.", "Toma la cuerda con brazos extendidos."],
      technique: [
        "Jala hacia la cara separando las manos.",
        "Controla el regreso sin encoger hombros.",
      ],
      commonMistakes: ["Usar demasiado peso.", "Convertirlo en remo."],
    },
  },
  {
    name: "Elevaciones laterales",
    primaryMuscles: ["hombros"],
    secondaryMuscles: ["trapecio"],
    equipment: ["mancuernas", "polea", "banda"],
    tags: ["hombros", "aislamiento", "hipertrofia"],
    guide: {
      setup: ["Sostén la carga a los lados.", "Mantén torso estable."],
      technique: ["Eleva brazos hasta una altura cómoda.", "Baja lento sin perder control."],
      commonMistakes: ["Balancear el cuerpo.", "Encoger hombros en cada repetición."],
    },
  },
  {
    name: "Curl de bíceps",
    primaryMuscles: ["bíceps"],
    secondaryMuscles: ["antebrazos"],
    equipment: ["mancuernas", "barra", "polea"],
    tags: ["brazos", "aislamiento"],
    guide: {
      setup: ["De pie con codos cerca del torso.", "Agarra la carga con muñecas firmes."],
      technique: ["Flexiona codos sin mover hombros.", "Baja controlando todo el recorrido."],
      commonMistakes: ["Balancear la espalda.", "Adelantar los codos para terminar."],
    },
  },
  {
    name: "Extensión de tríceps en polea",
    primaryMuscles: ["tríceps"],
    secondaryMuscles: [],
    equipment: ["polea"],
    tags: ["brazos", "aislamiento", "máquina"],
    guide: {
      setup: [
        "Coloca codos cerca del torso.",
        "Inclina ligeramente el cuerpo si ayuda a estabilizar.",
      ],
      technique: ["Extiende codos hacia abajo.", "Regresa sin mover los hombros."],
      commonMistakes: ["Abrir los codos.", "Usar el torso para empujar."],
    },
  },
  {
    name: "Fondos en banco",
    primaryMuscles: ["tríceps"],
    secondaryMuscles: ["pecho", "hombro anterior"],
    equipment: ["banca", "peso corporal"],
    tags: ["empuje", "brazos", "sin máquinas"],
    guide: {
      setup: ["Apoya manos en el borde de la banca.", "Coloca pies al frente con control."],
      technique: ["Baja solo hasta un rango cómodo.", "Sube extendiendo codos sin rebotar."],
      commonMistakes: ["Bajar demasiado profundo.", "Alejar demasiado la cadera de la banca."],
    },
  },
  {
    name: "Plancha",
    type: "duration",
    primaryMuscles: ["core"],
    secondaryMuscles: ["hombros", "glúteos"],
    equipment: ["peso corporal"],
    tags: ["core", "sin máquinas", "estabilidad"],
    weightRelevant: false,
    guide: {
      setup: ["Apoya antebrazos bajo hombros.", "Forma una línea de cabeza a talones."],
      technique: ["Mantén abdomen y glúteos activos.", "Respira sin perder posición."],
      commonMistakes: ["Hundir la cadera.", "Elevar demasiado la cadera."],
    },
  },
  {
    name: "Dead bug",
    primaryMuscles: ["core"],
    secondaryMuscles: ["flexores de cadera"],
    equipment: ["peso corporal"],
    tags: ["core", "principiante", "control"],
    weightRelevant: false,
    guide: {
      setup: ["Acuéstate boca arriba con brazos arriba.", "Eleva rodillas a 90 grados."],
      technique: [
        "Extiende brazo y pierna contraria con control.",
        "Mantén la espalda baja estable.",
      ],
      commonMistakes: ["Arquear la espalda.", "Moverse demasiado rápido."],
    },
  },
  {
    name: "Pallof press",
    primaryMuscles: ["core"],
    secondaryMuscles: ["hombros", "glúteos"],
    equipment: ["polea", "banda"],
    tags: ["core", "anti-rotación", "funcional"],
    guide: {
      setup: ["Colócate de lado a la polea o banda.", "Sostén el agarre frente al pecho."],
      technique: [
        "Extiende brazos resistiendo la rotación.",
        "Regresa lento manteniendo postura.",
      ],
      commonMistakes: ["Girar el torso.", "Usar una resistencia que rompa la técnica."],
    },
  },
  {
    name: "Farmer carry",
    type: "duration",
    primaryMuscles: ["core", "antebrazos"],
    secondaryMuscles: ["trapecio", "glúteos", "piernas"],
    equipment: ["mancuernas", "kettlebells"],
    tags: ["carga", "funcional", "core"],
    guide: {
      setup: ["Toma dos cargas del mismo peso.", "Párate alto con hombros estables."],
      technique: ["Camina con pasos controlados.", "Mantén abdomen firme y mirada al frente."],
      commonMistakes: [
        "Inclinarse hacia un lado.",
        "Caminar demasiado rápido perdiendo postura.",
      ],
    },
  },
  {
    name: "Kettlebell swing",
    primaryMuscles: ["glúteos", "isquiotibiales"],
    secondaryMuscles: ["core", "espalda alta"],
    equipment: ["kettlebell"],
    tags: ["bisagra", "funcional", "potencia"],
    guide: {
      setup: [
        "Coloca la kettlebell frente a los pies.",
        "Prepara una bisagra de cadera, no una sentadilla.",
      ],
      technique: ["Impulsa con cadera y glúteos.", "Deja que los brazos guíen, no levanten."],
      commonMistakes: [
        "Hacer sentadilla en cada repetición.",
        "Levantar con hombros o espalda baja.",
      ],
    },
  },
  {
    name: "Press de pecho en máquina",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["tríceps", "hombro anterior"],
    equipment: ["máquina"],
    tags: ["empuje", "tren superior", "máquina", "principiante", "hipertrofia"],
    guide: {
      setup: [
        "Ajusta el asiento para que los agarres queden a media altura del pecho.",
        "Apoya espalda y pies con estabilidad.",
      ],
      technique: [
        "Empuja al frente sin encoger hombros.",
        "Regresa con control hasta un rango cómodo.",
      ],
      commonMistakes: ["Llevar los codos demasiado atrás.", "Separar la espalda del respaldo."],
    },
  },
  {
    name: "Press con mancuernas en banca plana",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["tríceps", "hombro anterior"],
    equipment: ["mancuernas", "banca"],
    tags: ["empuje", "tren superior", "mancuernas", "hipertrofia"],
    guide: {
      setup: [
        "Acuéstate con pies firmes y mancuernas a los lados del pecho.",
        "Mantén muñecas alineadas sobre codos.",
      ],
      technique: [
        "Empuja las mancuernas sin chocarlas arriba.",
        "Baja lento hasta un rango controlado.",
      ],
      commonMistakes: ["Forzar demasiada profundidad.", "Perder estabilidad de muñecas."],
    },
  },
  {
    name: "Press de hombro en máquina",
    primaryMuscles: ["hombros"],
    secondaryMuscles: ["tríceps", "hombro anterior"],
    equipment: ["máquina"],
    tags: ["empuje", "hombros", "máquina", "principiante", "hipertrofia"],
    guide: {
      setup: [
        "Ajusta el asiento para empezar con agarres cerca de los hombros.",
        "Apoya espalda y mantén pies firmes.",
      ],
      technique: ["Empuja arriba sin bloquear agresivamente.", "Baja con control sin rebotar."],
      commonMistakes: ["Arquear la espalda.", "Subir hombros hacia las orejas."],
    },
  },
  {
    name: "Remo con banda",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "hombro posterior", "core"],
    equipment: ["banda"],
    tags: ["tirón", "espalda", "banda", "sin máquinas", "principiante"],
    guide: {
      setup: ["Ancla la banda en un punto estable.", "Toma tensión inicial con torso alto."],
      technique: ["Jala llevando codos hacia atrás.", "Regresa lento sin perder postura."],
      commonMistakes: ["Inclinarse hacia atrás para crear impulso.", "Encoger hombros al jalar."],
    },
  },
  {
    name: "Split squat",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["peso corporal", "mancuernas"],
    tags: ["unilateral", "pierna", "principiante", "sin máquinas"],
    guide: {
      setup: [
        "Coloca un pie adelante y otro atrás con base estable.",
        "Empieza sin carga si necesitas control.",
      ],
      technique: [
        "Baja verticalmente manteniendo equilibrio.",
        "Sube empujando con la pierna delantera.",
      ],
      commonMistakes: ["Dar una postura demasiado corta.", "Ir rápido perdiendo alineación."],
    },
  },
  {
    name: "Peso muerto con kettlebell",
    primaryMuscles: ["glúteos", "isquiotibiales"],
    secondaryMuscles: ["core", "espalda baja"],
    equipment: ["kettlebell", "mancuerna"],
    tags: ["bisagra", "posterior", "principiante", "funcional"],
    guide: {
      setup: ["Coloca la carga entre los pies.", "Prepara cadera atrás y espalda neutra."],
      technique: ["Sube extendiendo cadera con la carga cerca.", "Baja controlando la bisagra."],
      commonMistakes: ["Convertirlo en sentadilla.", "Alejar la carga del cuerpo."],
    },
  },
  {
    name: "Plancha lateral",
    type: "duration",
    primaryMuscles: ["core"],
    secondaryMuscles: ["glúteos", "hombros"],
    equipment: ["peso corporal"],
    tags: ["core", "estabilidad", "sin máquinas", "principiante"],
    weightRelevant: false,
    guide: {
      setup: [
        "Apoya antebrazo bajo hombro y alinea el cuerpo.",
        "Usa rodillas apoyadas si necesitas una variante más simple.",
      ],
      technique: ["Eleva la cadera y mantén respiración controlada.", "Sostén sin girar el torso."],
      commonMistakes: ["Colapsar sobre el hombro.", "Dejar caer la cadera."],
    },
  },
  {
    name: "Crunch en polea",
    primaryMuscles: ["core"],
    secondaryMuscles: ["flexores de cadera"],
    equipment: ["polea"],
    tags: ["core", "máquina", "aislamiento"],
    guide: {
      setup: [
        "Colócate frente a la polea alta con cuerda.",
        "Fija cadera y toma una carga moderada.",
      ],
      technique: ["Flexiona el torso con control.", "Regresa lento sin perder tensión."],
      commonMistakes: ["Jalar con brazos.", "Usar impulso en lugar de control abdominal."],
    },
  },
  {
    name: "Abducción de cadera en máquina",
    primaryMuscles: ["glúteos"],
    secondaryMuscles: ["cadera"],
    equipment: ["máquina"],
    tags: ["glúteos", "máquina", "aislamiento", "hipertrofia"],
    guide: {
      setup: ["Ajusta el asiento y los apoyos laterales.", "Siéntate estable con espalda apoyada."],
      technique: ["Abre piernas con control.", "Regresa lento sin soltar la carga."],
      commonMistakes: ["Usar demasiado impulso.", "Reducir demasiado el recorrido."],
    },
  },
  {
    name: "Curl martillo",
    primaryMuscles: ["bíceps"],
    secondaryMuscles: ["antebrazos"],
    equipment: ["mancuernas"],
    tags: ["brazos", "aislamiento", "mancuernas"],
    guide: {
      setup: ["Sostén mancuernas con palmas enfrentadas.", "Mantén codos cerca del torso."],
      technique: ["Flexiona codos sin balancear el cuerpo.", "Baja controlando todo el recorrido."],
      commonMistakes: ["Adelantar los codos.", "Usar impulso de espalda."],
    },
  },
  {
    name: "Sentadilla hack",
    primaryMuscles: ["cuádriceps"],
    secondaryMuscles: ["glúteos", "isquiotibiales"],
    equipment: ["máquina"],
    tags: ["pierna", "máquina", "hipertrofia"],
    guide: {
      setup: ["Apoya espalda y hombros en la máquina.", "Coloca pies firmes en la plataforma."],
      technique: ["Baja con rango controlado.", "Empuja la plataforma sin despegar la espalda."],
      commonMistakes: ["Bloquear rodillas con fuerza.", "Bajar perdiendo apoyo de talones."],
    },
  },
  {
    name: "Aducción de cadera en máquina",
    primaryMuscles: ["aductores"],
    secondaryMuscles: ["cadera"],
    equipment: ["máquina"],
    tags: ["pierna", "máquina", "aislamiento", "hipertrofia"],
    guide: {
      setup: ["Ajusta el asiento y los apoyos internos.", "Siéntate estable con espalda apoyada."],
      technique: ["Cierra piernas con control.", "Regresa lento sin soltar la carga."],
      commonMistakes: ["Rebotar al final del recorrido.", "Usar una carga que mueva la pelvis."],
    },
  },
  {
    name: "Remo en máquina con pecho apoyado",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "hombro posterior"],
    equipment: ["máquina"],
    tags: ["tirón", "espalda", "máquina", "hipertrofia"],
    guide: {
      setup: ["Ajusta el soporte al pecho.", "Toma los agarres con hombros relajados."],
      technique: ["Jala codos hacia atrás.", "Regresa lento manteniendo el pecho apoyado."],
      commonMistakes: ["Separar el pecho del soporte.", "Encoger hombros al jalar."],
    },
  },
  {
    name: "Jalón con brazos rectos",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["tríceps", "core"],
    equipment: ["polea"],
    tags: ["tirón", "espalda", "aislamiento"],
    guide: {
      setup: ["Coloca la polea alta.", "Inclina ligeramente el torso con brazos extendidos."],
      technique: ["Lleva el agarre hacia los muslos.", "Sube lento sin perder tensión."],
      commonMistakes: ["Doblar demasiado los codos.", "Convertirlo en empuje de tríceps."],
    },
  },
  {
    name: "Cruce de poleas",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["hombro anterior"],
    equipment: ["polea"],
    tags: ["empuje", "aislamiento", "hipertrofia"],
    guide: {
      setup: ["Coloca las poleas a una altura cómoda.", "Da un paso al frente con torso estable."],
      technique: ["Junta manos al frente con codos suaves.", "Regresa hasta un rango cómodo."],
      commonMistakes: ["Usar impulso del torso.", "Estirar más allá de lo controlable."],
    },
  },
  {
    name: "Patada de glúteo en polea",
    primaryMuscles: ["glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["polea"],
    tags: ["glúteos", "posterior", "aislamiento"],
    guide: {
      setup: ["Ajusta la tobillera en polea baja.", "Sujétate para mantener equilibrio."],
      technique: ["Lleva la pierna atrás con control.", "Regresa sin girar la cadera."],
      commonMistakes: ["Arquear la espalda baja.", "Balancear la pierna con impulso."],
    },
  },
  {
    name: "Aperturas inversas con mancuernas",
    primaryMuscles: ["hombro posterior"],
    secondaryMuscles: ["espalda alta", "trapecio"],
    equipment: ["mancuernas", "banca"],
    tags: ["hombros", "tirón", "aislamiento", "mancuernas"],
    guide: {
      setup: ["Inclina el torso o usa banca inclinada.", "Sostén mancuernas ligeras."],
      technique: ["Abre brazos hacia los lados.", "Baja lento sin perder postura."],
      commonMistakes: ["Usar demasiado peso.", "Encoger hombros en cada repetición."],
    },
  },
  {
    name: "Peso muerto a una pierna con mancuerna",
    primaryMuscles: ["isquiotibiales", "glúteos"],
    secondaryMuscles: ["core", "espalda baja"],
    equipment: ["mancuernas"],
    tags: ["bisagra", "unilateral", "posterior", "mancuernas"],
    guide: {
      setup: ["Sostén la mancuerna cerca del cuerpo.", "Mantén una ligera flexión en la rodilla."],
      technique: ["Lleva la cadera atrás elevando la pierna libre.", "Sube con control y equilibrio."],
      commonMistakes: ["Girar la cadera abierta.", "Buscar profundidad perdiendo espalda neutra."],
    },
  },
  {
    name: "Pullover con mancuerna",
    primaryMuscles: ["espalda", "pecho"],
    secondaryMuscles: ["tríceps", "core"],
    equipment: ["mancuerna", "banca"],
    tags: ["tren superior", "mancuernas", "accesorio"],
    guide: {
      setup: ["Acuéstate en banca con una mancuerna sobre el pecho.", "Mantén codos suaves."],
      technique: ["Baja la carga detrás de la cabeza con control.", "Regresa sin arquear la espalda."],
      commonMistakes: ["Doblar y estirar codos como tríceps.", "Forzar demasiado el rango."],
    },
  },
  {
    name: "Bird dog",
    type: "duration",
    primaryMuscles: ["core"],
    secondaryMuscles: ["glúteos", "espalda baja"],
    equipment: ["peso corporal"],
    tags: ["core", "estabilidad", "principiante", "sin máquinas"],
    weightRelevant: false,
    guide: {
      setup: ["Colócate en cuatro puntos.", "Mantén manos bajo hombros y rodillas bajo cadera."],
      technique: ["Extiende brazo y pierna contraria.", "Regresa lento sin girar el torso."],
      commonMistakes: ["Arquear la espalda.", "Moverse rápido perdiendo control."],
    },
  },
  {
    name: "Elevación de piernas colgado",
    primaryMuscles: ["core"],
    secondaryMuscles: ["flexores de cadera", "antebrazos"],
    equipment: ["barra", "peso corporal"],
    tags: ["core", "sin máquinas", "control"],
    guide: {
      setup: ["Cuelga con agarre firme y hombros activos.", "Empieza con piernas extendidas o rodillas flexionadas."],
      technique: ["Eleva piernas o rodillas con control.", "Baja lento sin balancearte."],
      commonMistakes: ["Usar impulso.", "Perder tensión del abdomen al bajar."],
    },
  },
  {
    name: "Extensión de espalda en banco",
    primaryMuscles: ["espalda baja", "glúteos"],
    secondaryMuscles: ["isquiotibiales"],
    equipment: ["banca", "peso corporal"],
    tags: ["posterior", "bisagra", "control"],
    guide: {
      setup: ["Ajusta el banco para apoyar la cadera.", "Cruza brazos o sostén carga ligera si aplica."],
      technique: ["Baja con control desde la cadera.", "Sube hasta alinear el torso sin hiperextender."],
      commonMistakes: ["Arquear arriba de más.", "Hacer el movimiento rápido y sin control."],
    },
  },
];

export function createSeedExercises(now = toIsoUtc()): Exercise[] {
  return seedExerciseInputs.map((exercise) => ({
    ...exercise,
    id: createSeedExerciseId(exercise.name),
    nameNormalized: normalizeExerciseName(exercise.name),
    type: exercise.type || "reps",
    weightRelevant: exercise.weightRelevant ?? true,
    equipmentDetail:
      equipmentDetailsByExerciseName[exercise.name] ?? exercise.equipment.join(", "),
    media: createExerciseMedia(exercise.name),
    isCustom: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function seedExerciseLibrary(db: WorkoutDatabase = appDb): Promise<number> {
  const now = toIsoUtc();

  try {
    return await db.transaction("rw", db.meta, db.exercises, async () => {
      const seedExercises = createSeedExercises(now);
      const existingExercises = await db.exercises.toArray();
      const existingExerciseByName = new Map<string, Exercise>(
        existingExercises.map((exercise) => [exercise.nameNormalized, exercise]),
      );
      const existingNames = new Set(existingExerciseByName.keys());
      const missingExercises = seedExercises.filter(
        (exercise) => !existingNames.has(exercise.nameNormalized),
      );
      const seedUpdates = seedExercises.flatMap((seedExercise) => {
        const existingExercise = existingExerciseByName.get(seedExercise.nameNormalized);

        if (
          !existingExercise ||
          existingExercise.isCustom ||
          !hasSeedExerciseMetadataChanges(existingExercise, seedExercise)
        ) {
          return [];
        }

        return [
          {
            ...existingExercise,
            type: seedExercise.type,
            weightRelevant: seedExercise.weightRelevant,
            primaryMuscles: seedExercise.primaryMuscles,
            secondaryMuscles: seedExercise.secondaryMuscles,
            equipment: seedExercise.equipment,
            equipmentDetail: seedExercise.equipmentDetail,
            tags: seedExercise.tags,
            guide: seedExercise.guide,
            media: seedExercise.media,
            updatedAt: now,
          },
        ];
      });

      if (missingExercises.length > 0) {
        await db.exercises.bulkPut(missingExercises);
      }

      if (seedUpdates.length > 0) {
        await db.exercises.bulkPut(seedUpdates);
      }

      await db.meta.put({
        id: EXERCISE_LIBRARY_SEED_META_ID,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        value: {
          insertedCount: missingExercises.length,
          updatedCount: seedUpdates.length,
        },
      });

      return missingExercises.length;
    });
  } catch (error) {
    const existingSeed = await db.meta.get(EXERCISE_LIBRARY_SEED_META_ID);
    if (existingSeed && isConstraintError(error)) {
      return 0;
    }

    throw error;
  }
}

function createSeedExerciseId(name: string): string {
  return `seed:exercise:${normalizeExerciseName(name).replace(/\s+/g, "-")}`;
}

function datasetMedia(
  sourceExerciseId: string,
  sourceExerciseName: string,
  imagePath: string,
  animationPath: string,
): DatasetMediaInput {
  return {
    sourceExerciseId,
    sourceExerciseName,
    imagePath,
    animationPath,
  };
}

function createExerciseMedia(name: string): ExerciseMedia | undefined {
  const media = datasetMediaByExerciseName[name];

  if (!media) return undefined;

  return {
    source: "hasaneyldrm/exercises-dataset",
    sourceExerciseId: media.sourceExerciseId,
    sourceExerciseName: media.sourceExerciseName,
    sourceUrl: EXERCISES_DATASET_SOURCE_URL,
    imageUrl: `${EXERCISES_DATASET_ASSET_BASE_URL}/${media.imagePath}`,
    animationUrl: `${EXERCISES_DATASET_ASSET_BASE_URL}/${media.animationPath}`,
  };
}

function hasSeedExerciseMetadataChanges(
  existingExercise: Exercise,
  seedExercise: Exercise,
): boolean {
  return (
    existingExercise.type !== seedExercise.type ||
    existingExercise.weightRelevant !== seedExercise.weightRelevant ||
    existingExercise.equipmentDetail !== seedExercise.equipmentDetail ||
    !areStringArraysEqual(existingExercise.primaryMuscles, seedExercise.primaryMuscles) ||
    !areStringArraysEqual(existingExercise.secondaryMuscles, seedExercise.secondaryMuscles) ||
    !areStringArraysEqual(existingExercise.equipment, seedExercise.equipment) ||
    !areStringArraysEqual(existingExercise.tags, seedExercise.tags) ||
    !areStringArraysEqual(existingExercise.guide.setup, seedExercise.guide.setup) ||
    !areStringArraysEqual(existingExercise.guide.technique, seedExercise.guide.technique) ||
    !areStringArraysEqual(existingExercise.guide.commonMistakes, seedExercise.guide.commonMistakes) ||
    !areExerciseMediaEqual(existingExercise.media, seedExercise.media)
  );
}

function areStringArraysEqual(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((item, index) => item === second[index]);
}

function areExerciseMediaEqual(first?: ExerciseMedia, second?: ExerciseMedia): boolean {
  if (!first || !second) {
    return first === second;
  }

  return (
    first.source === second.source &&
    first.sourceExerciseId === second.sourceExerciseId &&
    first.sourceExerciseName === second.sourceExerciseName &&
    first.sourceUrl === second.sourceUrl &&
    first.imageUrl === second.imageUrl &&
    first.animationUrl === second.animationUrl
  );
}

function isConstraintError(error: unknown): boolean {
  return (
    isRecord(error) &&
    (error.name === "ConstraintError" || error.name === "BulkError")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

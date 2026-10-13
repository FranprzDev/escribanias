// Solo para el build (getStaticPaths). Nunca importar desde src/scripts/:
// cada página embebe únicamente los datos de SU escribanía.
import raw from "../data/escribanias.json";
import type { Escribania } from "./escribanias";

export const ESCRIBANIAS: Escribania[] = raw as Escribania[];

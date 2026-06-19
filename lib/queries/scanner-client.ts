/**
 * Leituras do scanner no browser — somente Supabase.
 * Path Django (flags ON) fica em `scanner.ts` para Server Components / actions.
 */
export {
  buscarDemandasScaneadasPorTurnoSetor,
  buscarOperadorScaneadoPorId,
  buscarOperacoesScaneadasPorDemanda,
  buscarOperadorScaneadoPorToken,
  buscarTurnoSetorScaneadoPorToken,
  listarOperadoresAtivosScanner,
} from './scanner-core'

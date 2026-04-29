-- Sprint 41 - Correcoes dos Security Advisors do Supabase
-- Projeto remoto: jsuufbgdcqxogimmocof
-- Escopo:
-- - tornar a view de status de maquinas security_invoker
-- - fixar search_path das funcoes apontadas pelo advisor
-- - habilitar RLS nas tabelas publicas de qualidade
-- - restringir EXECUTE de funcoes SECURITY DEFINER ao service_role

begin;

alter view public.vw_status_maquinas
  set (security_invoker = true);

alter function public.proximo_codigo_operacao()
  set search_path = public, pg_temp;

alter function public.turno_ops_sincronizar_setores_trigger()
  set search_path = public, pg_temp;

alter function public.turno_setor_ops_espelhar_em_turno_setor_demandas_trigger()
  set search_path = public, pg_temp;

alter function public.sincronizar_turno_setor_ops(uuid)
  set search_path = public, pg_temp;

alter function public.turno_setor_ops_sincronizar_operacoes_trigger()
  set search_path = public, pg_temp;

alter function public.sincronizar_turno_setor_operacoes(uuid)
  set search_path = public, pg_temp;

alter table public.qualidade_registros enable row level security;
alter table public.qualidade_detalhes enable row level security;

drop policy if exists qualidade_registros_select_authenticated
  on public.qualidade_registros;

create policy qualidade_registros_select_authenticated
  on public.qualidade_registros
  for select
  to authenticated
  using (true);

drop policy if exists qualidade_detalhes_select_authenticated
  on public.qualidade_detalhes;

create policy qualidade_detalhes_select_authenticated
  on public.qualidade_detalhes
  for select
  to authenticated
  using (true);

revoke execute on function public.backfill_consistencia_turno(uuid)
  from public, anon, authenticated;
grant execute on function public.backfill_consistencia_turno(uuid)
  to service_role;

revoke execute on function public.backfill_consistencia_turnos_recentes(timestamp with time zone)
  from public, anon, authenticated;
grant execute on function public.backfill_consistencia_turnos_recentes(timestamp with time zone)
  to service_role;

revoke execute on function public.buscar_turno_setor_op_scanner(text)
  from public, anon, authenticated;
grant execute on function public.buscar_turno_setor_op_scanner(text)
  to service_role;

revoke execute on function public.obter_disponibilidade_fluxo_turno_setor_operacao(uuid)
  from public, anon, authenticated;
grant execute on function public.obter_disponibilidade_fluxo_turno_setor_operacao(uuid)
  to service_role;

revoke execute on function public.recalcular_turno_setor(uuid)
  from public, anon, authenticated;
grant execute on function public.recalcular_turno_setor(uuid)
  to service_role;

revoke execute on function public.registrar_producao_supervisor_em_lote(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_producao_supervisor_em_lote(uuid, uuid, jsonb)
  to service_role;

revoke execute on function public.registrar_producao_turno_setor_op(uuid, uuid, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.registrar_producao_turno_setor_op(uuid, uuid, integer, uuid)
  to service_role;

revoke execute on function public.registrar_producao_turno_setor_operacao(uuid, uuid, integer, uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.registrar_producao_turno_setor_operacao(uuid, uuid, integer, uuid, text, uuid, text)
  to service_role;

revoke execute on function public.registrar_revisao_qualidade_turno_setor_operacao(uuid, uuid, integer, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_revisao_qualidade_turno_setor_operacao(uuid, uuid, integer, integer, text, jsonb)
  to service_role;

revoke execute on function public.sincronizar_andamento_turno_op(uuid)
  from public, anon, authenticated;
grant execute on function public.sincronizar_andamento_turno_op(uuid)
  to service_role;

revoke execute on function public.sincronizar_andamento_turno_setor_op(uuid)
  from public, anon, authenticated;
grant execute on function public.sincronizar_andamento_turno_setor_op(uuid)
  to service_role;

revoke execute on function public.sincronizar_turno_setor_demanda(uuid)
  from public, anon, authenticated;
grant execute on function public.sincronizar_turno_setor_demanda(uuid)
  to service_role;

revoke execute on function public.sincronizar_turno_setor_demanda_legada(uuid)
  from public, anon, authenticated;
grant execute on function public.sincronizar_turno_setor_demanda_legada(uuid)
  to service_role;

commit;

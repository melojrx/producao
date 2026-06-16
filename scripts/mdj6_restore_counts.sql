SELECT 'configuracao_turno' AS tabela, COUNT(*) AS total FROM configuracao_turno
UNION ALL SELECT 'configuracao_turno_blocos', COUNT(*) FROM configuracao_turno_blocos
UNION ALL SELECT 'maquinas', COUNT(*) FROM maquinas
UNION ALL SELECT 'metas_mensais', COUNT(*) FROM metas_mensais
UNION ALL SELECT 'operacoes', COUNT(*) FROM operacoes
UNION ALL SELECT 'operadores', COUNT(*) FROM operadores
UNION ALL SELECT 'produto_operacoes', COUNT(*) FROM produto_operacoes
UNION ALL SELECT 'produtos', COUNT(*) FROM produtos
UNION ALL SELECT 'qualidade_defeitos', COUNT(*) FROM qualidade_defeitos
UNION ALL SELECT 'qualidade_detalhes', COUNT(*) FROM qualidade_detalhes
UNION ALL SELECT 'qualidade_registros', COUNT(*) FROM qualidade_registros
UNION ALL SELECT 'registros_producao', COUNT(*) FROM registros_producao
UNION ALL SELECT 'setores', COUNT(*) FROM setores
UNION ALL SELECT 'tipos_maquina', COUNT(*) FROM tipos_maquina
UNION ALL SELECT 'turno_operadores', COUNT(*) FROM turno_operadores
UNION ALL SELECT 'turno_ops', COUNT(*) FROM turno_ops
UNION ALL SELECT 'turno_setor_demandas', COUNT(*) FROM turno_setor_demandas
UNION ALL SELECT 'turno_setor_operacoes', COUNT(*) FROM turno_setor_operacoes
UNION ALL SELECT 'turno_setor_ops', COUNT(*) FROM turno_setor_ops
UNION ALL SELECT 'turno_setores', COUNT(*) FROM turno_setores
UNION ALL SELECT 'turnos', COUNT(*) FROM turnos
UNION ALL SELECT 'usuarios_sistema', COUNT(*) FROM usuarios_sistema
ORDER BY tabela;

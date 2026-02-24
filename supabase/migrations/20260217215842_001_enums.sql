-- ============================================================
-- Migration 001: ENUMs do ELLAHOS
-- Fase 1 - Schema Base
-- ============================================================

-- Tipo de projeto (spec: job_type -> real: project_type)
DO $$ BEGIN
  CREATE TYPE project_type AS ENUM (
    'filme_publicitario',
    'branded_content',
    'videoclipe',
    'documentario',
    'conteudo_digital',
    'evento_livestream',
    'institucional',
    'motion_graphics',
    'fotografia',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do job (lifecycle completo - 14 status)
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'briefing_recebido',
    'orcamento_elaboracao',
    'orcamento_enviado',
    'aguardando_aprovacao',
    'aprovado_selecao_diretor',
    'cronograma_planejamento',
    'pre_producao',
    'producao_filmagem',
    'pos_producao',
    'aguardando_aprovacao_final',
    'entregue',
    'finalizado',
    'cancelado',
    'pausado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sub-status de pos-producao (tipado, nao texto livre)
DO $$ BEGIN
  CREATE TYPE pos_sub_status AS ENUM (
    'edicao',
    'cor',
    'vfx',
    'finalizacao',
    'audio',
    'revisao'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Prioridade (spec: job_priority -> real: priority_level)
DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM (
    'alta',
    'media',
    'baixa'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Segmento de mercado do cliente (spec: segment_type -> real: client_segment)
DO $$ BEGIN
  CREATE TYPE client_segment AS ENUM (
    'automotivo',
    'varejo',
    'fintech',
    'alimentos_bebidas',
    'moda',
    'tecnologia',
    'saude',
    'educacao',
    'governo',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Funcao no job (equipe)
DO $$ BEGIN
  CREATE TYPE team_role AS ENUM (
    'diretor',
    'produtor_executivo',
    'coordenador_producao',
    'dop',
    'primeiro_assistente',
    'editor',
    'colorista',
    'motion_designer',
    'diretor_arte',
    'figurinista',
    'produtor_casting',
    'produtor_locacao',
    'gaffer',
    'som_direto',
    'maquiador',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de contratacao de membro da equipe
DO $$ BEGIN
  CREATE TYPE hiring_status AS ENUM (
    'orcado',
    'proposta_enviada',
    'confirmado',
    'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de entregavel
DO $$ BEGIN
  CREATE TYPE deliverable_status AS ENUM (
    'pendente',
    'em_producao',
    'aguardando_aprovacao',
    'aprovado',
    'entregue'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de evento no historico (audit trail)
DO $$ BEGIN
  CREATE TYPE history_event_type AS ENUM (
    'status_change',
    'field_update',
    'team_change',
    'comment',
    'file_upload',
    'approval',
    'financial_update'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de aprovacao (portugues, conforme decisao do projeto)
DO $$ BEGIN
  CREATE TYPE approval_type AS ENUM (
    'interna',
    'externa_cliente'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Papel do usuario no sistema (RBAC)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'admin',
    'ceo',
    'produtor_executivo',
    'coordenador',
    'diretor',
    'financeiro',
    'atendimento',
    'comercial',
    'freelancer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

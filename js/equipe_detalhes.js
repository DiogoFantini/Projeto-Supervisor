const SUPABASE_URL = 'https://tnlsqmrluxugwialhrej.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QaX1w_iFxZold_RnCkHtSA_z6hAbM-2';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let equipe_id = null;
let unidade_id = null;
let lista_integrantes_equipe = [];
let modo_remover_func_ativo = false;
let funcionario_selecionado_para_remover = null;

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  } else {
    obter_parametros_url();
  }
}

function obter_parametros_url() {
  const parametros = new URLSearchParams(window.location.search);
  equipe_id = parametros.get('id');
  unidade_id = parametros.get('unidade_id');

  if (!equipe_id) {
    alert('Equipe não especificada.');
    window.location.href = 'unidades.html';
    return;
  }

  const btnVoltar = document.getElementById('btn_voltar_unidade');
  if (btnVoltar && unidade_id) {
    btnVoltar.href = `unidade_detalhes.html?id=${unidade_id}`;
  }

  carregar_dados_equipe();
}

async function carregar_dados_equipe() {
  const { data: equipe, error: errEquipe } = await _supabase
    .from('equipes')
    .select('nome, unidades(nome)')
    .eq('id', equipe_id)
    .single();

  if (errEquipe || !equipe) {
    console.error('Erro ao carregar equipe:', errEquipe);
    document.getElementById('titulo_equipe_detalhes').innerText = 'Equipe não encontrada';
    return;
  }

  const nome_unidade = equipe.unidades?.nome || 'Unidade';
  document.getElementById('titulo_equipe_detalhes').innerText = `${nome_unidade} - ${equipe.nome}`;

  const { data: integrantes, error: errIntegrantes } = await _supabase
    .from('funcionarios')
    .select('*')
    .eq('equipe_id', equipe_id)
    .order('nome', { ascending: true });

  if (errIntegrantes) {
    console.error('Erro ao carregar integrantes:', errIntegrantes);
    return;
  }

  lista_integrantes_equipe = integrantes || [];
  exibir_integrantes(lista_integrantes_equipe);
}

function alternar_modo_remover_funcionario() {
  modo_remover_func_ativo = !modo_remover_func_ativo;
  const btn = document.getElementById('btn_modo_remover_func');
  const thAcoes = document.getElementById('coluna_acoes_cabecalho_func');

  if (modo_remover_func_ativo) {
    btn.innerText = 'Concluir';
    btn.style.backgroundColor = '#64748b';
    if (thAcoes) thAcoes.classList.remove('oculto');
  } else {
    btn.innerText = 'Remover funcionário';
    btn.style.backgroundColor = '#ef4444';
    if (thAcoes) thAcoes.classList.add('oculto');
  }

  exibir_integrantes(lista_integrantes_equipe);
}

function exibir_integrantes(lista) {
  const tbody = document.getElementById('tabela_integrantes_equipe');
  if (!tbody) return;
  tbody.innerHTML = '';

  const totalColunas = modo_remover_func_ativo ? 4 : 3;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align: center; color: #64748b;">Nenhum funcionário vinculado a esta equipe.</td></tr>`;
    return;
  }

  lista.forEach(func => {
    const colunaAcaoHTML = modo_remover_func_ativo 
      ? `<td class="coluna-remocao"><button class="btn-x-remocao" onclick='confirmar_remocao_funcionario(${JSON.stringify(func)})' title="Remover funcionário">&times;</button></td>`
      : '';

    tbody.innerHTML += `
      <tr>
        <td><strong>${func.nome}</strong></td>
        <td>${func.cargo || '-'}</td>
        <td>${func.especializacao || '-'}</td>
        ${colunaAcaoHTML}
      </tr>
    `;
  });
}

function filtrar_integrantes() {
  const campoBusca = document.getElementById('campo_busca_integrante');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtrados = lista_integrantes_equipe.filter(f => {
    const bate_nome = f.nome ? f.nome.toLowerCase().includes(termo) : false;
    const bate_cargo = f.cargo ? f.cargo.toLowerCase().includes(termo) : false;
    const bate_esp = f.especializacao ? f.especializacao.toLowerCase().includes(termo) : false;

    return bate_nome || bate_cargo || bate_esp;
  });

  exibir_integrantes(filtrados);
}

function confirmar_remocao_funcionario(func) {
  funcionario_selecionado_para_remover = func;
  document.getElementById('nome_funcionario_remover').innerText = func.nome;
  const modal = document.getElementById('modal_confirmar_remocao_funcionario');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_confirmar_remocao() {
  const modal = document.getElementById('modal_confirmar_remocao_funcionario');
  if (modal) modal.classList.add('oculto');
  funcionario_selecionado_para_remover = null;
}

async function executar_remocao_funcionario() {
  if (!funcionario_selecionado_para_remover) return;

  const { error } = await _supabase
    .from('funcionarios')
    .update({ equipe_id: null })
    .eq('id', funcionario_selecionado_para_remover.id);

  if (error) {
    alert('Erro ao remover funcionário da equipe: ' + error.message);
  } else {
    fechar_modal_confirmar_remocao();
    carregar_dados_equipe();
  }
}

async function abrir_modal_adicionar_funcionario() {
  const modal = document.getElementById('modal_adicionar_funcionario_equipe');
  if (modal) modal.classList.remove('oculto');
  await carregar_funcionarios_disponiveis();
}

function fechar_modal_adicionar_funcionario() {
  const modal = document.getElementById('modal_adicionar_funcionario_equipe');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_adicionar_funcionario_equipe');
  if (form) form.reset();
}

async function carregar_funcionarios_disponiveis() {
  const select = document.getElementById('select_funcionario_disponivel');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando funcionários...</option>';

  const { data: funcionarios, error } = await _supabase
    .from('funcionarios')
    .select('id, nome, cargo, equipe_id')
    .is('equipe_id', null)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar funcionários disponíveis:', error);
    select.innerHTML = '<option value="">Erro ao carregar lista</option>';
    return;
  }

  const disponiveis = funcionarios || [];
  select.innerHTML = '<option value="">-- Selecione um funcionário --</option>';

  if (disponiveis.length === 0) {
    select.innerHTML = '<option value="">Nenhum funcionário disponível sem equipe</option>';
  } else {
    disponiveis.forEach(f => {
      select.innerHTML += `<option value="${f.id}">${f.nome} (${f.cargo || 'Sem cargo'})</option>`;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();

  const formAdicionar = document.getElementById('form_adicionar_funcionario_equipe');
  if (formAdicionar) {
    formAdicionar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const funcionario_id = document.getElementById('select_funcionario_disponivel').value;

      if (!funcionario_id) {
        alert('Selecione um funcionário da lista.');
        return;
      }

      const { error } = await _supabase
        .from('funcionarios')
        .update({ equipe_id: equipe_id })
        .eq('id', funcionario_id);

      if (error) {
        alert('Erro ao vincular funcionário: ' + error.message);
      } else {
        fechar_modal_adicionar_funcionario();
        carregar_dados_equipe();
      }
    });
  }

  window.addEventListener('click', (event) => {
    const modal_adicionar = document.getElementById('modal_adicionar_funcionario_equipe');
    const modal_confirmar = document.getElementById('modal_confirmar_remocao_funcionario');
    if (event.target === modal_adicionar) fechar_modal_adicionar_funcionario();
    if (event.target === modal_confirmar) fechar_modal_confirmar_remocao();
  });
});
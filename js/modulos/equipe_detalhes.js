let abortController = null;
let equipe_id = null;
let unidade_id = null;
let lista_integrantes_equipe = [];
let modo_remover_func_ativo = false;
let funcionario_selecionado_para_remover = null;
let salvando = false;

export async function mount(container) {
  abortController = new AbortController();
  const { signal } = abortController;

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
    btnVoltar.href = `unidade_detalhes.html?id=${encodeURIComponent(unidade_id)}`;
  }

  salvando = false;
  modo_remover_func_ativo = false;
  funcionario_selecionado_para_remover = null;

  await carregar_dados_equipe();

  // Delegação de eventos de clique
  container.addEventListener('click', async (e) => {
    const acaoEl = e.target.closest('[data-acao]');
    if (!acaoEl) return;

    const acao = acaoEl.getAttribute('data-acao');

    if (acao === 'alternar-modo-remover-func') {
      alternar_modo_remover_funcionario();
    } else if (acao === 'abrir-modal-adicionar-func') {
      await abrir_modal_adicionar_funcionario();
    } else if (acao === 'fechar-modal-adicionar-func') {
      fechar_modal_adicionar_funcionario();
    } else if (acao === 'iniciar-remocao-func') {
      const funcJson = acaoEl.getAttribute('data-func');
      if (funcJson) {
        confirmar_remocao_funcionario(JSON.parse(funcJson));
      }
    } else if (acao === 'fechar-modal-confirmar-remocao') {
      fechar_modal_confirmar_remocao();
    } else if (acao === 'executar-remocao-func') {
      await executar_remocao_funcionario();
    }
  }, { signal });

  // Filtro de integrantes
  container.addEventListener('input', (e) => {
    if (e.target.id === 'campo_busca_integrante') {
      filtrar_integrantes(e.target.value);
    }
  }, { signal });

  // Formulário de adição
  container.addEventListener('submit', async (e) => {
    if (e.target.id === 'form_adicionar_funcionario_equipe') {
      e.preventDefault();
      await vincular_funcionario_equipe();
    }
  }, { signal });

  // Listeners globais no window com signal
  window.addEventListener('click', (e) => {
    const modal_adicionar = document.getElementById('modal_adicionar_funcionario_equipe');
    const modal_confirmar = document.getElementById('modal_confirmar_remocao_funcionario');
    if (modal_adicionar && e.target === modal_adicionar) fechar_modal_adicionar_funcionario();
    if (modal_confirmar && e.target === modal_confirmar) fechar_modal_confirmar_remocao();
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fechar_modal_adicionar_funcionario();
      fechar_modal_confirmar_remocao();
    }
  }, { signal });
}

export function unmount() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  salvando = false;
  equipe_id = null;
  unidade_id = null;
  lista_integrantes_equipe = [];
  modo_remover_func_ativo = false;
  funcionario_selecionado_para_remover = null;
}

async function carregar_dados_equipe() {
  const { data: equipe, error: errEquipe } = await window._supabase
    .from('equipes')
    .select('nome, unidades(nome)')
    .eq('id', equipe_id)
    .single();

  const tituloEl = document.getElementById('titulo_equipe_detalhes');
  if (errEquipe || !equipe) {
    console.error('Erro ao carregar equipe:', errEquipe);
    if (tituloEl) tituloEl.innerText = 'Equipe não encontrada';
    return;
  }

  const nome_unidade = equipe.unidades?.nome || 'Unidade';
  if (tituloEl) tituloEl.innerText = `${nome_unidade} - ${equipe.nome}`;

  const { data: integrantes, error: errIntegrantes } = await window._supabase
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
    if (btn) {
      btn.innerText = 'Concluir';
      btn.style.backgroundColor = '#64748b';
    }
    if (thAcoes) thAcoes.classList.remove('oculto');
  } else {
    if (btn) {
      btn.innerText = 'Remover funcionário';
      btn.style.backgroundColor = '#ef4444';
    }
    if (thAcoes) thAcoes.classList.add('oculto');
  }

  exibir_integrantes(lista_integrantes_equipe);
}

function exibir_integrantes(lista) {
  const tbody = document.getElementById('tabela_integrantes_equipe');
  if (!tbody) return;

  const totalColunas = modo_remover_func_ativo ? 4 : 3;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align: center; color: #64748b;">Nenhum funcionário vinculado a esta equipe.</td></tr>`;
    return;
  }

  // Mutação única
  tbody.innerHTML = lista.map(func => {
    const nome_seguro = window.sanitizar_texto(func.nome);
    const cargo_seguro = window.sanitizar_texto(func.cargo || '-');
    const esp_segura = window.sanitizar_texto(func.especializacao || '-');
    const funcJson = window.sanitizar_texto(JSON.stringify(func));

    const colunaAcaoHTML = modo_remover_func_ativo 
      ? `<td class="coluna-remocao"><button type="button" class="btn-x-remocao" data-acao="iniciar-remocao-func" data-func='${funcJson}' title="Remover funcionário">&times;</button></td>`
      : '';

    return `
      <tr>
        <td><strong>${nome_seguro}</strong></td>
        <td>${cargo_seguro}</td>
        <td>${esp_segura}</td>
        ${colunaAcaoHTML}
      </tr>
    `;
  }).join('');
}

function filtrar_integrantes(termoBruto) {
  const termo = (termoBruto || '').toLowerCase().trim();

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
  const nomeEl = document.getElementById('nome_funcionario_remover');
  if (nomeEl) nomeEl.innerText = func.nome;
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

  const { error } = await window._supabase
    .from('funcionarios')
    .update({ equipe_id: null })
    .eq('id', funcionario_selecionado_para_remover.id);

  if (error) {
    alert('Erro ao remover funcionário da equipe: ' + error.message);
  } else {
    fechar_modal_confirmar_remocao();
    await carregar_dados_equipe();
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

  const { data: funcionarios, error } = await window._supabase
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

  if (disponiveis.length === 0) {
    select.innerHTML = '<option value="">Nenhum funcionário disponível sem equipe</option>';
  } else {
    select.innerHTML = '<option value="">-- Selecione um funcionário --</option>' +
      disponiveis.map(f => {
        const nome_seguro = window.sanitizar_texto(f.nome);
        const cargo_seguro = window.sanitizar_texto(f.cargo || 'Sem cargo');
        return `<option value="${encodeURIComponent(f.id)}">${nome_seguro} (${cargo_seguro})</option>`;
      }).join('');
  }
}

async function vincular_funcionario_equipe() {
  if (salvando) return;

  const select = document.getElementById('select_funcionario_disponivel');
  if (!select) return;
  const funcionario_id = select.value;

  if (!funcionario_id) {
    alert('Selecione um funcionário da lista.');
    return;
  }

  const form = document.getElementById('form_adicionar_funcionario_equipe');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';

  try {
    salvando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Adicionando...';
    }

    const { error } = await window._supabase
      .from('funcionarios')
      .update({ equipe_id: equipe_id })
      .eq('id', funcionario_id);

    if (error) {
      alert('Erro ao vincular funcionário: ' + error.message);
    } else {
      fechar_modal_adicionar_funcionario();
      await carregar_dados_equipe();
    }
  } finally {
    salvando = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;
    }
  }
}

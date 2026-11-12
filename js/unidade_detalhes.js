var unidade_id = null;
var lista_equipes_unidade = [];
var lista_funcs_sem_equipe = [];
var modo_desvincular_ativo = false;
var equipe_selecionada_para_desvincular = null;

function obter_id_url_e_carregar() {
  const parametros = new URLSearchParams(window.location.search);
  unidade_id = parametros.get('id');

  if (!unidade_id) {
    alert('Unidade não especificada.');
    window.location.href = 'unidades.html';
    return;
  }

  carregar_dados_unidade();
}

async function carregar_dados_unidade() {
  const { data: unidade, error: errUnidade } = await _supabase
    .from('unidades')
    .select('nome')
    .eq('id', unidade_id)
    .single();

  if (errUnidade || !unidade) {
    console.error('Erro ao carregar unidade:', errUnidade);
    const titulo = document.getElementById('titulo_unidade');
    if (titulo) titulo.innerText = 'Unidade não encontrada';
    return;
  }

  const tituloEl = document.getElementById('titulo_unidade');
  if (tituloEl) tituloEl.innerText = unidade.nome;

  // Carrega equipes vinculadas
  const { data: equipes, error: errEquipes } = await _supabase
    .from('equipes')
    .select('*')
    .eq('unidade_id', unidade_id)
    .order('created_at', { ascending: false });

  if (errEquipes) {
    console.error('Erro ao carregar equipes da unidade:', errEquipes);
    return;
  }

  lista_equipes_unidade = equipes || [];
  exibir_equipes_unidade(lista_equipes_unidade);

  // Carrega funcionários vinculados à unidade que NÃO possuem equipe
  const { data: funcionarios, error: errFuncs } = await _supabase
    .from('funcionarios')
    .select('id, nome, cargo, numero_funcional, equipe_id, unidade_id')
    .eq('unidade_id', unidade_id)
    .is('equipe_id', null)
    .order('nome', { ascending: true });

  if (errFuncs) {
    console.error('Erro ao carregar funcionários sem equipe:', errFuncs);
    lista_funcs_sem_equipe = [];
  } else {
    lista_funcs_sem_equipe = funcionarios || [];
  }

  atualizar_estado_dropdown_funcionarios(lista_funcs_sem_equipe);
}

function atualizar_estado_dropdown_funcionarios(lista) {
  const btnDropdown = document.getElementById('btn_dropdown_funcs');
  const tituloDropdown = document.getElementById('titulo_dropdown_funcs');
  const conteudoDropdown = document.getElementById('conteudo_dropdown_funcs');

  if (tituloDropdown) tituloDropdown.innerText = `Funcionários sem equipe (${lista.length})`;

  if (lista.length > 0) {
    if (btnDropdown) btnDropdown.removeAttribute('disabled');
    renderizar_lista_funcs_dropdown(lista);
  } else {
    if (btnDropdown) btnDropdown.setAttribute('disabled', 'true');
    if (conteudoDropdown) conteudoDropdown.classList.add('oculto');
  }
}

function alternar_dropdown_funcs_sem_equipe() {
  const conteudoDropdown = document.getElementById('conteudo_dropdown_funcs');
  if (conteudoDropdown) {
    conteudoDropdown.classList.toggle('oculto');
  }
}

function renderizar_lista_funcs_dropdown(lista) {
  const ul = document.getElementById('lista_funcs_sem_equipe');
  if (!ul) return;
  ul.innerHTML = '';

  if (lista.length === 0) {
    ul.innerHTML = '<li style="text-align: center; color: #64748b; padding: 8px;">Nenhum funcionário encontrado.</li>';
    return;
  }

  lista.forEach(f => {
    const nome_seguro = sanitizar_texto(f.nome);
    const cargo_seguro = sanitizar_texto(f.cargo || 'Sem cargo');
    const nf_seguro = sanitizar_texto(f.numero_funcional ? `(NF: ${f.numero_funcional})` : '');

    ul.innerHTML += `
      <li class="item-func-dropdown">
        <span><strong>${nome_seguro}</strong> ${nf_seguro}</span>
        <span class="cargo">${cargo_seguro}</span>
      </li>
    `;
  });
}

function filtrar_funcionarios_sem_equipe() {
  const campoBusca = document.getElementById('campo_busca_funcs_sem_equipe');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtrados = lista_funcs_sem_equipe.filter(f => {
    const bate_nome = f.nome ? f.nome.toLowerCase().includes(termo) : false;
    const bate_cargo = f.cargo ? f.cargo.toLowerCase().includes(termo) : false;
    const bate_nf = f.numero_funcional ? f.numero_funcional.toLowerCase().includes(termo) : false;
    return bate_nome || bate_cargo || bate_nf;
  });

  renderizar_lista_funcs_dropdown(filtrados);
}

function alternar_modo_desvincular() {
  modo_desvincular_ativo = !modo_desvincular_ativo;
  const btn = document.getElementById('btn_modo_desvincular');
  const thAcoes = document.getElementById('coluna_acoes_cabecalho');

  if (modo_desvincular_ativo) {
    if (btn) {
      btn.innerText = 'Concluir';
      btn.style.backgroundColor = '#64748b';
    }
    if (thAcoes) thAcoes.classList.remove('oculto');
  } else {
    if (btn) {
      btn.innerText = 'Desvincular equipe';
      btn.style.backgroundColor = '#ef4444';
    }
    if (thAcoes) thAcoes.classList.add('oculto');
  }

  exibir_equipes_unidade(lista_equipes_unidade);
}

function exibir_equipes_unidade(lista) {
  const tbody = document.getElementById('tabela_equipes_unidade');
  if (!tbody) return;
  tbody.innerHTML = '';

  const totalColunas = modo_desvincular_ativo ? 3 : 2;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align: center; color: #64748b;">Nenhuma equipe vinculada a esta unidade.</td></tr>`;
    return;
  }

  lista.forEach(eq => {
    const nome_seguro = sanitizar_texto(eq.nome);
    const descricao_segura = sanitizar_texto(eq.descricao || '-');
    const colunaAcaoHTML = modo_desvincular_ativo 
      ? `<td class="coluna-remocao"><button class="btn-x-remocao" onclick='confirmar_desvinculo_equipe(${JSON.stringify(eq)})' title="Desvincular equipe">&times;</button></td>`
      : '';

    tbody.innerHTML += `
      <tr>
        <td>
          <a href="equipe_detalhes.html?id=${eq.id}&unidade_id=${unidade_id}" class="nome-equipe-link">
            ${nome_seguro}
          </a>
        </td>
        <td>${descricao_segura}</td>
        ${colunaAcaoHTML}
      </tr>
    `;
  });
}

function filtrar_equipes_unidade() {
  const campoBusca = document.getElementById('campo_busca_equipe');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtradas = lista_equipes_unidade.filter(eq => {
    const bate_nome = eq.nome ? eq.nome.toLowerCase().includes(termo) : false;
    const bate_descricao = eq.descricao ? eq.descricao.toLowerCase().includes(termo) : false;

    return bate_nome || bate_descricao;
  });

  exibir_equipes_unidade(filtradas);
}

function filtrar_equipes() {
  if (document.getElementById('tabela_equipes_unidade')) {
    filtrar_equipes_unidade();
  } else if (typeof filtrar_equipes_geral === 'function' && document.getElementById('tabela_equipes')) {
    filtrar_equipes_geral();
  }
}

function confirmar_desvinculo_equipe(equipe) {
  equipe_selecionada_para_desvincular = equipe;
  const nomeEl = document.getElementById('nome_equipe_desvincular');
  if (nomeEl) nomeEl.innerText = equipe.nome;
  const modal = document.getElementById('modal_confirmar_desvinculo_equipe');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_confirmar_desvinculo() {
  const modal = document.getElementById('modal_confirmar_desvinculo_equipe');
  if (modal) modal.classList.add('oculto');
  equipe_selecionada_para_desvincular = null;
}

async function executar_desvinculo_equipe() {
  if (!equipe_selecionada_para_desvincular) return;

  const { error } = await _supabase
    .from('equipes')
    .update({ unidade_id: null })
    .eq('id', equipe_selecionada_para_desvincular.id);

  if (error) {
    alert('Erro ao desvincular equipe: ' + error.message);
  } else {
    fechar_modal_confirmar_desvinculo();
    carregar_dados_unidade();
  }
}

async function abrir_modal_vincular_equipe() {
  const modal = document.getElementById('modal_vincular_equipe_unidade');
  if (modal) modal.classList.remove('oculto');
  await carregar_equipes_disponiveis();
}

function fechar_modal_vincular_equipe() {
  const modal = document.getElementById('modal_vincular_equipe_unidade');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_vincular_equipe_unidade');
  if (form) form.reset();
}

async function carregar_equipes_disponiveis() {
  const select = document.getElementById('select_equipe_disponivel');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando equipes...</option>';

  const { data: equipes, error } = await _supabase
    .from('equipes')
    .select('id, nome, unidade_id')
    .is('unidade_id', null)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar equipes disponíveis:', error);
    select.innerHTML = '<option value="">Erro ao carregar lista</option>';
    return;
  }

  const disponiveis = equipes || [];
  select.innerHTML = '<option value="">-- Selecione uma equipe --</option>';

  if (disponiveis.length === 0) {
    select.innerHTML = '<option value="">Nenhuma equipe disponível sem unidade cadastrada</option>';
  } else {
    disponiveis.forEach(eq => {
      const nome_seguro = sanitizar_texto(eq.nome);
      select.innerHTML += `<option value="${eq.id}">${nome_seguro}</option>`;
    });
  }
}

function iniciar_tela_unidade_detalhes() {
  modo_desvincular_ativo = false;
  equipe_selecionada_para_desvincular = null;
  obter_id_url_e_carregar();

  const formVincular = document.getElementById('form_vincular_equipe_unidade');
  if (formVincular && !formVincular.dataset.eventoRegistrado) {
    formVincular.dataset.eventoRegistrado = "true";
    formVincular.addEventListener('submit', async (e) => {
      e.preventDefault();
      const equipe_selecionada_id = document.getElementById('select_equipe_disponivel').value;

      if (!equipe_selecionada_id) {
        alert('Selecione uma equipe da lista.');
        return;
      }

      const { error } = await _supabase
        .from('equipes')
        .update({ unidade_id: unidade_id })
        .eq('id', equipe_selecionada_id);

      if (error) {
        alert('Erro ao vincular equipe: ' + error.message);
      } else {
        fechar_modal_vincular_equipe();
        carregar_dados_unidade();
      }
    });
  }

  if (!window.listenersModalUnidadeDetalhesInjetados) {
    window.listenersModalUnidadeDetalhesInjetados = true;
    window.addEventListener('click', (event) => {
      const modal_vincular = document.getElementById('modal_vincular_equipe_unidade');
      const modal_confirmar = document.getElementById('modal_confirmar_desvinculo_equipe');
      if (modal_vincular && event.target === modal_vincular) fechar_modal_vincular_equipe();
      if (modal_confirmar && event.target === modal_confirmar) fechar_modal_confirmar_desvinculo();
    });
  }
}

// 1. Gatilho F5 / Acesso direto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tabela_equipes_unidade')) {
    iniciar_tela_unidade_detalhes();
  }
});

// 2. Gatilho Navegação SPA
document.addEventListener('spa_tela_carregada', (e) => {
  const url_carregada = e.detail;
  if (url_carregada.includes('unidade_detalhes.html')) {
    iniciar_tela_unidade_detalhes();
  }
});

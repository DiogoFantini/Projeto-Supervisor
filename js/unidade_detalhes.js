let unidade_id = null;
let lista_equipes_unidade = [];
let modo_desvincular_ativo = false;
let equipe_selecionada_para_desvincular = null;

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
    document.getElementById('titulo_unidade').innerText = 'Unidade não encontrada';
    return;
  }

  document.getElementById('titulo_unidade').innerText = unidade.nome;

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
  exibir_equipes(lista_equipes_unidade);
}

function alternar_modo_desvincular() {
  modo_desvincular_ativo = !modo_desvincular_ativo;
  const btn = document.getElementById('btn_modo_desvincular');
  const thAcoes = document.getElementById('coluna_acoes_cabecalho');

  if (modo_desvincular_ativo) {
    btn.innerText = 'Concluir';
    btn.style.backgroundColor = '#64748b';
    if (thAcoes) thAcoes.classList.remove('oculto');
  } else {
    btn.innerText = 'Desvincular equipe';
    btn.style.backgroundColor = '#ef4444';
    if (thAcoes) thAcoes.classList.add('oculto');
  }

  exibir_equipes(lista_equipes_unidade);
}

function exibir_equipes(lista) {
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

function filtrar_equipes() {
  const campoBusca = document.getElementById('campo_busca_equipe');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtradas = lista_equipes_unidade.filter(eq => {
    const bate_nome = eq.nome ? eq.nome.toLowerCase().includes(termo) : false;
    const bate_descricao = eq.descricao ? eq.descricao.toLowerCase().includes(termo) : false;

    return bate_nome || bate_descricao;
  });

  exibir_equipes(filtradas);
}

function confirmar_desvinculo_equipe(equipe) {
  equipe_selecionada_para_desvincular = equipe;
  document.getElementById('nome_equipe_desvincular').innerText = equipe.nome;
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

document.addEventListener('DOMContentLoaded', () => {
  obter_id_url_e_carregar();

  const formVincular = document.getElementById('form_vincular_equipe_unidade');
  if (formVincular) {
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

  window.addEventListener('click', (event) => {
    const modal_vincular = document.getElementById('modal_vincular_equipe_unidade');
    const modal_confirmar = document.getElementById('modal_confirmar_desvinculo_equipe');
    if (event.target === modal_vincular) fechar_modal_vincular_equipe();
    if (event.target === modal_confirmar) fechar_modal_confirmar_desvinculo();
  });
});
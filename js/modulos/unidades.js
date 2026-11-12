let abortController = null;
let lista_unidades_todas = [];
let salvando = false;

export async function mount(container) {
  abortController = new AbortController();
  const { signal } = abortController;

  salvando = false;

  // Carrega e renderiza os dados
  await carregar_unidades(container);

  // Delegação de eventos no container da tela com signal
  container.addEventListener('click', (e) => {
    const acaoEl = e.target.closest('[data-acao]');
    if (!acaoEl) return;

    const acao = acaoEl.getAttribute('data-acao');
    if (acao === 'abrir-modal-cadastro') {
      abrir_modal_cadastro();
    } else if (acao === 'fechar-modal-cadastro') {
      fechar_modal_cadastro();
    }
  }, { signal });

  // Filtro de busca em tempo real com signal
  container.addEventListener('input', (e) => {
    if (e.target.id === 'campo_busca_unidade') {
      filtrar_unidades(e.target.value);
    }
  }, { signal });

  // Envio do formulário de cadastro com signal
  container.addEventListener('submit', async (e) => {
    if (e.target.id === 'form_cadastro_unidade') {
      e.preventDefault();
      await salvar_unidade();
    }
  }, { signal });

  // Listeners globais seguros vinculados ao signal
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('modal_cadastro_unidade');
    if (modal && e.target === modal) {
      fechar_modal_cadastro();
    }
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fechar_modal_cadastro();
    }
  }, { signal });
}

export function unmount() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  salvando = false;
  lista_unidades_todas = [];
}

async function carregar_unidades() {
  const { data, error } = await window._supabase
    .from('unidades')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar unidades:', error);
    return;
  }

  lista_unidades_todas = data || [];
  exibir_unidades(lista_unidades_todas);
}

function exibir_unidades(lista) {
  const tbody = document.getElementById('tabela_unidades');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #64748b;">Nenhuma unidade encontrada.</td></tr>';
    return;
  }

  // Mutação única no DOM
  tbody.innerHTML = lista.map(u => {
    const nome_seguro = window.sanitizar_texto(u.nome);
    const endereco_tratado = window.sanitizar_texto(u.endereco || '-');
    const id_seguro = encodeURIComponent(u.id);

    return `
      <tr class="linha-clicavel" onclick="window.location.href='unidade_detalhes.html?id=${id_seguro}'">
        <td><strong>${nome_seguro}</strong></td>
        <td>${endereco_tratado}</td>
      </tr>
    `;
  }).join('');
}

function filtrar_unidades(termoBruto) {
  const termo = (termoBruto || '').toLowerCase().trim();

  const filtradas = lista_unidades_todas.filter(u => {
    const bate_nome = u.nome ? u.nome.toLowerCase().includes(termo) : false;
    const bate_endereco = u.endereco ? u.endereco.toLowerCase().includes(termo) : false;
    return bate_nome || bate_endereco;
  });

  exibir_unidades(filtradas);
}

function abrir_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_unidade');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_unidade');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_unidade');
  if (form) form.reset();
}

async function salvar_unidade() {
  if (salvando) return;

  const form = document.getElementById('form_cadastro_unidade');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;
  const textoOriginal = btnSubmit ? btnSubmit.innerText : '';

  const nomeEl = document.getElementById('novo_nome_unidade');
  const enderecoEl = document.getElementById('novo_endereco_unidade');
  if (!nomeEl) return;

  const nome = nomeEl.value.trim();
  const endereco = enderecoEl && enderecoEl.value.trim() !== '' ? enderecoEl.value.trim() : null;

  try {
    salvando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = 'Salvando...';
    }

    const { error } = await window._supabase.from('unidades').insert([{
      nome,
      endereco
    }]);

    if (error) {
      alert('Erro ao cadastrar unidade: ' + error.message);
    } else {
      fechar_modal_cadastro();
      await carregar_unidades();
    }
  } finally {
    salvando = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = textoOriginal;
    }
  }
}

var lista_unidades_todas = [];

async function carregar_unidades() {
  const { data, error } = await _supabase
    .from('unidades')
    .select('*')
    .order('nome', { ascending: true });

  if (error) return console.error('Erro ao buscar unidades:', error);

  lista_unidades_todas = data || [];
  exibir_unidades(lista_unidades_todas);
}

function exibir_unidades(lista) {
  const tbody = document.getElementById('tabela_unidades');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #64748b;">Nenhuma unidade encontrada.</td></tr>';
    return;
  }

  lista.forEach(u => {
    const nome_seguro = sanitizar_texto(u.nome);
    // Trata valores nulos, undefined ou strings compostas apenas por espaços
    const endereco_tratado = u.endereco && u.endereco.trim() !== '' ? sanitizar_texto(u.endereco.trim()) : '-';

    tbody.innerHTML += `
      <tr>
        <td>
          <a href="unidade_detalhes.html?id=${u.id}" class="nome-equipe-link">
            <strong>${nome_seguro}</strong>
          </a>
        </td>
        <td>${endereco_tratado}</td>
      </tr>
    `;
  });
}

function filtrar_unidades() {
  const campoBusca = document.getElementById('campo_busca_unidade');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtradas = lista_unidades_todas.filter(u => {
    const bate_nome = u.nome ? u.nome.toLowerCase().includes(termo) : false;
    const bate_endereco = u.endereco ? u.endereco.toLowerCase().includes(termo) : false;
    return bate_nome || bate_endereco;
  });

  exibir_unidades(filtradas);
}

function abrir_modal_cadastro_unidade() {
  const modal = document.getElementById('modal_cadastro_unidade');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_cadastro_unidade() {
  const modal = document.getElementById('modal_cadastro_unidade');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_unidade');
  if (form) form.reset();
}

function abrir_modal_cadastro() {
  if (document.getElementById('modal_cadastro_unidade')) {
    abrir_modal_cadastro_unidade();
  } else if (typeof abrir_modal_cadastro_equipe === 'function' && document.getElementById('modal_cadastro_equipe')) {
    abrir_modal_cadastro_equipe();
  } else if (typeof abrir_modal_cadastro_funcionario === 'function' && document.getElementById('modal_cadastro_funcionario')) {
    abrir_modal_cadastro_funcionario();
  }
}

function fechar_modal_cadastro() {
  if (document.getElementById('modal_cadastro_unidade')) {
    fechar_modal_cadastro_unidade();
  } else if (typeof fechar_modal_cadastro_equipe === 'function' && document.getElementById('modal_cadastro_equipe')) {
    fechar_modal_cadastro_equipe();
  } else if (typeof fechar_modal_cadastro_funcionario === 'function' && document.getElementById('modal_cadastro_funcionario')) {
    fechar_modal_cadastro_funcionario();
  }
}

function iniciar_tela_unidades() {
  carregar_unidades();

  const formCadastro = document.getElementById('form_cadastro_unidade');
  // Impede registro duplicado de eventos no SPA
  if (formCadastro && !formCadastro.dataset.eventoRegistrado) {
    formCadastro.dataset.eventoRegistrado = "true";
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('novo_nome_unidade').value;
      const endereco = document.getElementById('novo_endereco_unidade').value;

      const { error } = await _supabase.from('unidades').insert([{
        nome: nome.trim(),
        endereco: endereco && endereco.trim() !== '' ? endereco.trim() : null
      }]);

      if (error) {
        alert('Erro ao cadastrar unidade: ' + error.message);
      } else {
        fechar_modal_cadastro();
        carregar_unidades();
      }
    });
  }

  // Tratamento de clique fora do modal adaptado para SPA
  if (!window.listenersModalUnidadeInjetados) {
    window.listenersModalUnidadeInjetados = true;
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('modal_cadastro_unidade');
      if (modal && event.target === modal) fechar_modal_cadastro();
    });
  }
}

// 1. Gatilho F5 / Acesso direto
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tabela_unidades')) {
    iniciar_tela_unidades();
  }
});

// 2. Gatilho Navegação SPA
document.addEventListener('spa_tela_carregada', (e) => {
  const url_carregada = e.detail;
  if (url_carregada.includes('unidades.html')) {
    iniciar_tela_unidades();
  }
});

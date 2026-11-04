const SUPABASE_URL = 'https://tnlsqmrluxugwialhrej.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QaX1w_iFxZold_RnCkHtSA_z6hAbM-2';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let lista_unidades_todas = [];

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  } else {
    carregar_unidades();
  }
}

async function carregar_unidades() {
  const { data, error } = await _supabase
    .from('unidades')
    .select('*, equipes(id, nome, descricao)')
    .order('created_at', { ascending: false });

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
    tbody.innerHTML += `
      <tr>
        <td>
          <a href="unidade_detalhes.html?id=${u.id}" class="nome-unidade-link">
            ${u.nome}
          </a>
        </td>
        <td>${u.endereco}</td>
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
    const bate_equipe = u.equipes && Array.isArray(u.equipes)
      ? u.equipes.some(eq => eq.nome && eq.nome.toLowerCase().includes(termo))
      : false;

    return bate_nome || bate_endereco || bate_equipe;
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

document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();

  const formCadastro = document.getElementById('form_cadastro_unidade');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('novo_nome_unidade').value;
      const endereco = document.getElementById('novo_endereco_unidade').value;

      const { error } = await _supabase.from('unidades').insert([{ nome, endereco }]);
      
      if (error) {
        alert('Erro ao cadastrar unidade: ' + error.message);
      } else {
        fechar_modal_cadastro();
        carregar_unidades();
      }
    });
  }

  window.addEventListener('click', (event) => {
    const modal_cadastro = document.getElementById('modal_cadastro_unidade');
    if (event.target === modal_cadastro) fechar_modal_cadastro();
  });
});
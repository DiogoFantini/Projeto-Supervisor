const SUPABASE_URL = 'https://tnlsqmrluxugwialhrej.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QaX1w_iFxZold_RnCkHtSA_z6hAbM-2';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let unidade_id = null;
let lista_equipes_unidade = [];

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  } else {
    obter_id_url_e_carregar();
  }
}

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
  // Busca o nome da unidade
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

  // Busca apenas as equipes pertencentes a esta unidade
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

function exibir_equipes(lista) {
  const tbody = document.getElementById('tabela_equipes_unidade');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #64748b;">Nenhuma equipe cadastrada nesta unidade.</td></tr>';
    return;
  }

  lista.forEach(eq => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${eq.nome}</strong></td>
        <td>${eq.descricao || '-'}</td>
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

document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();
});
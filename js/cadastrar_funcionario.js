const SUPABASE_URL = 'https://tnlsqmrluxugwialhrej.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QaX1w_iFxZold_RnCkHtSA_z6hAbM-2';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let lista_funcionarios_todos = [];

async function verificar_autenticacao() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
  } else {
    carregar_funcionarios();
  }
}

async function carregar_funcionarios() {
  const { data, error } = await _supabase
    .from('funcionarios')
    .select('*, equipes(nome, unidades(nome)))')
    .order('created_at', { ascending: false });

  if (error) return console.error('Erro ao buscar funcionários:', error);

  lista_funcionarios_todos = data || [];
  exibir_funcionarios(lista_funcionarios_todos);
}

function exibir_funcionarios(lista) {
  const tbody = document.getElementById('tabela_funcionarios');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">Nenhum funcionário encontrado.</td></tr>';
    return;
  }

  lista.forEach(f => {
    const nome_equipe = f.equipes?.nome || '-';
    const nome_unidade = f.equipes?.unidades?.nome || '-';

    tbody.innerHTML += `
      <tr>
        <td><strong>${f.nome}</strong></td>
        <td>${f.cargo || '-'}</td>
        <td>${f.especializacao || '-'}</td>
        <td>${nome_equipe}</td>
        <td>${nome_unidade}</td>
        <td class="coluna-acoes">
          <button class="btn-olho" onclick='abrir_modal_detalhes(${JSON.stringify(f)})' title="Visualizar detalhes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </td>
      </tr>
    `;
  });
}

function filtrar_funcionarios() {
  const campoBusca = document.getElementById('campo_busca_funcionario');
  if (!campoBusca) return;
  const termo = campoBusca.value.toLowerCase().trim();

  const filtrados = lista_funcionarios_todos.filter(f => {
    const nome_equipe = f.equipes?.nome || '';
    const nome_unidade = f.equipes?.unidades?.nome || '';

    const bate_nome = f.nome ? f.nome.toLowerCase().includes(termo) : false;
    const bate_cargo = f.cargo ? f.cargo.toLowerCase().includes(termo) : false;
    const bate_registro = f.registro_profissional ? f.registro_profissional.toLowerCase().includes(termo) : false;
    const bate_especializacao = f.especializacao ? f.especializacao.toLowerCase().includes(termo) : false;
    const bate_equipe = nome_equipe ? nome_equipe.toLowerCase().includes(termo) : false;
    const bate_unidade = nome_unidade ? nome_unidade.toLowerCase().includes(termo) : false;

    return bate_nome || bate_cargo || bate_registro || bate_especializacao || bate_equipe || bate_unidade;
  });

  exibir_funcionarios(filtrados);
}

function abrir_modal_detalhes(funcionario) {
  document.getElementById('detalhe_nome').innerText = funcionario.nome || '-';
  document.getElementById('detalhe_cargo').innerText = funcionario.cargo || '-';
  document.getElementById('detalhe_registro').innerText = funcionario.registro_profissional || '-';
  document.getElementById('detalhe_especializacao').innerText = funcionario.especializacao || '-';
  document.getElementById('detalhe_equipe').innerText = funcionario.equipes?.nome || '-';
  document.getElementById('detalhe_unidade').innerText = funcionario.equipes?.unidades?.nome || '-';

  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_detalhes() {
  const modal = document.getElementById('modal_detalhes_funcionario');
  if (modal) modal.classList.add('oculto');
}

function atualizar_campo_registro() {
  const cargoSelect = document.getElementById('novo_cargo_funcionario');
  const container = document.getElementById('container_registro_profissional');
  const label = document.getElementById('label_registro_profissional');
  const input = document.getElementById('novo_registro_funcionario');

  if (!cargoSelect || !container || !label || !input) return;

  const cargo = cargoSelect.value;

  const mapeamentoRegistros = {
    'Médico(a)': { label: 'CRM:', placeholder: 'Ex: CRM/SP 123456' },
    'Enfermeiro(a)': { label: 'COREN:', placeholder: 'Ex: COREN-SP 123456' },
    'Técnico(a) de Enfermagem': { label: 'COREN:', placeholder: 'Ex: COREN-SP 123456' },
    'Auxiliar de Enfermagem': { label: 'COREN:', placeholder: 'Ex: COREN-SP 123456' },
    'Dentista': { label: 'CRO:', placeholder: 'Ex: CRO-SP 123456' }
  };

  if (mapeamentoRegistros[cargo]) {
    label.innerHTML = `<strong>${mapeamentoRegistros[cargo].label}</strong>`;
    input.placeholder = mapeamentoRegistros[cargo].placeholder;
    input.required = true;
    container.classList.remove('oculto');
  } else {
    input.value = '';
    input.required = false;
    container.classList.add('oculto');
  }
}

function abrir_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.remove('oculto');
}

function fechar_modal_cadastro() {
  const modal = document.getElementById('modal_cadastro_funcionario');
  if (modal) modal.classList.add('oculto');
  const form = document.getElementById('form_cadastro_funcionario');
  if (form) form.reset();
  atualizar_campo_registro();
}

document.addEventListener('DOMContentLoaded', () => {
  verificar_autenticacao();

  const formCadastro = document.getElementById('form_cadastro_funcionario');
  if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = document.getElementById('novo_nome_funcionario').value;
      const cargoSelecionado = document.getElementById('novo_cargo_funcionario').value;
      const registro = document.getElementById('novo_registro_funcionario').value;
      const especializacao = document.getElementById('nova_especializacao_funcionario').value;

      const { error } = await _supabase.from('funcionarios').insert([{
        nome,
        cargo: cargoSelecionado,
        registro_profissional: registro || null,
        especializacao
      }]);

      if (error) {
        alert('Erro ao cadastrar funcionário: ' + error.message);
      } else {
        fechar_modal_cadastro();
        carregar_funcionarios();
      }
    });
  }

  window.addEventListener('click', (event) => {
    const modal_cadastro = document.getElementById('modal_cadastro_funcionario');
    const modal_detalhes = document.getElementById('modal_detalhes_funcionario');
    if (event.target === modal_cadastro) fechar_modal_cadastro();
    if (event.target === modal_detalhes) fechar_modal_detalhes();
  });
});
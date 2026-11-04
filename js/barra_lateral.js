document.addEventListener('DOMContentLoaded', () => {
  const caminhoPagina = window.location.pathname;

  const ehUnidades = caminhoPagina.includes('unidades.html');
  const ehEquipes = caminhoPagina.includes('equipes.html');
  const ehFuncionarios = caminhoPagina.includes('funcionarios.html');

  const htmlBarraLateral = `
    <aside class="barra-lateral">
      <h2>Sistema</h2>
      <a href="unidades.html" class="${ehUnidades ? 'active' : ''}">Unidades</a>
      <a href="equipes.html" class="${ehEquipes ? 'active' : ''}">Equipes</a>
      <a href="funcionarios.html" class="${ehFuncionarios ? 'active' : ''}">Funcionários</a>
      <button id="btnSairBarraLateral" class="btn-sair">Sair</button>
    </aside>
  `;

  document.body.insertAdjacentHTML('afterbegin', htmlBarraLateral);

  const botaoSair = document.getElementById('btnSairBarraLateral');
  if (botaoSair) {
    botaoSair.addEventListener('click', async () => {
      if (typeof _supabase !== 'undefined') {
        await _supabase.auth.signOut();
      }
      window.location.href = 'login.html';
    });
  }
});
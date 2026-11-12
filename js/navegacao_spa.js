/**
 * Roteador SPA Inteligente com Dynamic Imports e Gestão de Ciclo de Vida
 * Elimina recarregamento em popstate, gerencia mount/unmount de módulos ES6
 * e impede múltiplas montagens ou envios concorrentes.
 */

let moduloAtual = null;
let inicializacaoRealizada = false;
let navegacaoEmAndamento = false;

const rotas = {
  'unidades.html': () => import('./modulos/unidades.js'),
  'unidade_detalhes.html': () => import('./modulos/unidade_detalhes.js'),
  'equipes.html': () => import('./modulos/equipes.js'),
  'equipe_detalhes.html': () => import('./modulos/equipe_detalhes.js'),
  'funcionarios.html': () => import('./modulos/funcionarios.js'),
  'folgas_abonos.html': () => import('./modulos/folgas_abonos.js'),
  'gerenciar_usuarios.html': () => import('./modulos/gerenciar_usuarios.js')
};

function extrairNomeArquivo(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop().split('?')[0].split('#')[0] || '';
  } catch (e) {
    return url.split('?')[0].split('#')[0].split('/').pop() || '';
  }
}

export function atualizar_menu_ativo(url) {
  const nome_arquivo = extrairNomeArquivo(url);
  document.querySelectorAll('.link-navegacao, .sublink-navegacao').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const hrefArquivo = extrairNomeArquivo(href);
    if (hrefArquivo && hrefArquivo === nome_arquivo) {
      link.classList.add('ativo');
    } else {
      link.classList.remove('ativo');
    }
  });
}

export async function navegarPara(url, push = true) {
  if (navegacaoEmAndamento) return;

  const container = document.querySelector('.conteudo-principal');
  if (!container) {
    window.location.href = url;
    return;
  }

  const nomeArquivoDestino = extrairNomeArquivo(url);
  const nomeArquivoAtual = extrairNomeArquivo(window.location.href);

  // Se já está na mesma tela sem parâmetros de busca diferentes, apenas atualiza menu e evita remontagem
  if (push && nomeArquivoDestino === nomeArquivoAtual && !url.includes('?') && !window.location.search) {
    atualizar_menu_ativo(url);
    return;
  }

  try {
    navegacaoEmAndamento = true;

    // 1. Desmonta o módulo anterior (limpeza total de listeners, timers e memória via signal)
    if (moduloAtual && typeof moduloAtual.unmount === 'function') {
      try {
        moduloAtual.unmount();
      } catch (e) {
        console.warn('Erro ao desmontar módulo anterior:', e);
      }
      moduloAtual = null;
    }

    // 2. Busca e injeta o novo miolo de conteúdo HTML
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`Falha HTTP ${resposta.status}`);

    const html = await resposta.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const novoConteudo = doc.querySelector('.conteudo-principal');

    if (!novoConteudo) {
      window.location.href = url;
      return;
    }

    container.innerHTML = novoConteudo.innerHTML;

    // 3. Atualiza o histórico do navegador e a URL visível
    if (push) {
      window.history.pushState({}, '', url);
    }
    atualizar_menu_ativo(url);

    // 4. Carrega dinamicamente o módulo correspondente e executa mount()
    const carregadorModulo = rotas[nomeArquivoDestino];

    if (carregadorModulo) {
      moduloAtual = await carregadorModulo();
      if (typeof moduloAtual.mount === 'function') {
        await moduloAtual.mount(container);
      }
    }

    // 5. Notifica possíveis ouvintes da troca de tela
    document.dispatchEvent(new CustomEvent('spa_tela_carregada', { detail: url }));
  } catch (erro) {
    console.error('Erro na navegação SPA, aplicando fallback tradicional:', erro);
    window.location.href = url;
  } finally {
    navegacaoEmAndamento = false;
  }
}

// Interceptador global de cliques para links <a>
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  // Ignora links que solicitam comportamento padrão
  if (link.hasAttribute('download') || link.getAttribute('target') === '_blank' || link.dataset.noSpa !== undefined) {
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href === '#' || href.startsWith('javascript:')) return;

  // Apenas rotas internas da aplicação
  const destinoUrl = new URL(href, window.location.href);
  if (destinoUrl.origin !== window.location.origin) return;

  // Se o destino for login.html ou logout, permite navegação normal
  if (extrairNomeArquivo(destinoUrl.pathname) === 'login.html') return;

  // Intercepta e navega via SPA
  e.preventDefault();
  await navegarPara(href, true);
});

// Suporte nativo ao botão Voltar / Avançar do navegador sem reload
window.addEventListener('popstate', async () => {
  await navegarPara(window.location.href, false);
});

// Inicialização automática ao carregar a página inicialmente
async function inicializarTelaAtual() {
  if (inicializacaoRealizada) return;
  inicializacaoRealizada = true;

  const container = document.querySelector('.conteudo-principal');
  if (!container) return;

  const urlAtual = window.location.href;
  const nomeArquivo = extrairNomeArquivo(urlAtual);
  atualizar_menu_ativo(urlAtual);

  const carregadorModulo = rotas[nomeArquivo];
  if (carregadorModulo) {
    try {
      moduloAtual = await carregadorModulo();
      if (typeof moduloAtual.mount === 'function') {
        await moduloAtual.mount(container);
      }
    } catch (e) {
      console.error(`Erro ao montar tela inicial (${nomeArquivo}):`, e);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarTelaAtual, { once: true });
} else {
  inicializarTelaAtual();
}

// Expõe no escopo global para acionamento programático se necessário
window.navegarPara = navegarPara;
window.atualizar_menu_ativo = atualizar_menu_ativo;

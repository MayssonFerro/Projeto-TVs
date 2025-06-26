// Adiciona um único "ouvinte" que espera a página carregar completamente.
document.addEventListener("DOMContentLoaded", function() {

    // ======================================================
    // SEÇÃO 1: LÓGICA DO RELÓGIO
    // ======================================================
    const elementoData = document.getElementById('data');
    const elementoHora = document.getElementById('hora');

    // Só executa a lógica do relógio se os elementos existirem na página
    if (elementoData && elementoHora) {
        function atualizarRelogio() {
            const agora = new Date();
            const opcoesData = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
            
            // Formata a data e coloca a primeira letra em maiúsculo
            const dataFormatada = agora.toLocaleDateString('pt-BR', opcoesData);
            elementoData.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

            // Formata a hora para mostrar apenas Horas e Minutos (HH:MM)
            const horaFormatada = agora.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            elementoHora.textContent = horaFormatada;
        }
        
        // Inicia o relógio
        atualizarRelogio();
        setInterval(atualizarRelogio, 1000);
    }


    // ======================================================
    // SEÇÃO 2: LÓGICA DO QR CODE E IMAGEM DE FUNDO
    // ======================================================

    // Gera o QR Code (com a verificação para não duplicar)
    const qrcodeContainer = document.getElementById("qrcode");
    if (window.eventoLink && qrcodeContainer && qrcodeContainer.innerHTML.trim() === '') {
        new QRCode(qrcodeContainer, window.eventoLink);
    }

    // Define a imagem de fundo do painel, se existir
    if (window.eventoImagem) {
        const painel = document.querySelector('.painel');
        if (painel) {
            painel.style.backgroundImage = `url('${window.eventoImagem}')`;
            painel.style.backgroundSize = "cover";
            painel.style.backgroundPosition = "center";
        }
    }


// ======================================================
// SEÇÃO 3: LÓGICA DE ROTAÇÃO DE PÁGINAS (VERSÃO MELHORADA)
// ======================================================

// Adiciona uma linha no console do navegador para sabermos que o script começou
console.log("--- Iniciando Script de Rotação de Página ---");

    // 1. OBTER DADOS DO PYTHON
    // O filtro 'tojson' é a forma mais segura de passar variáveis do Jinja2 para o JS
    // Se este arquivo for servido por Flask/Jinja2, a linha abaixo será processada corretamente.
    // Caso esteja rodando puro (sem backend), defina manualmente o valor desejado.
    const deveMostrarAviso = typeof SHOW_AVISO !== "undefined" ? SHOW_AVISO : false;
    // Exemplo: substitua SHOW_AVISO pelo valor desejado se não estiver usando Jinja2.
    // const deveMostrarAviso = false;
    // Se estiver usando Jinja2, descomente a linha abaixo e comente a linha acima:
    // const deveMostrarAviso = {{ show_aviso|tojson|default('false') }};
    // Exibe no console se a página de aviso deve ou não ser mostrada
    console.log("Condição para mostrar a página de aviso:", deveMostrarAviso);

    // 2. MONTAR A LISTA DE PÁGINAS VÁLIDAS PARA ESTE MOMENTO
    const paginasBase = ['/', '/clima'];
    let paginasAtuais = [...paginasBase]; // Cria uma cópia da lista base

    if (deveMostrarAviso) {
        // Se a condição for verdadeira, adiciona a página de aviso na lista de rotação
        paginasAtuais.push('/aviso-intervalo');
    }
    // Mostra no console qual a lista final de páginas para esta rotação
    console.log("Lista de páginas na rotação atual:", paginasAtuais);

    // 3. DEFINIR TEMPO DE EXIBIÇÃO
    const tempoDeExibicao = 15000; // Aumentado para 15 segundos

    // 4. DECIDIR QUAL SERÁ A PRÓXIMA PÁGINA
    const paginaAtualPath = window.location.pathname;
    console.log("Página atual é:", paginaAtualPath);

    const indexDaPaginaAtual = paginasAtuais.indexOf(paginaAtualPath);
    console.log("Índice da página atual na lista:", indexDaPaginaAtual, "(Se for -1, a página não está na lista de rotação)");

    let proximaPagina;

    if (indexDaPaginaAtual !== -1) {
        // CASO 1: A página atual ESTÁ na lista de rotação válida.
        // Calcula a próxima página do ciclo normalmente.
        const indexDaProximaPagina = (indexDaPaginaAtual + 1) % paginasAtuais.length;
        proximaPagina = paginasAtuais[indexDaProximaPagina];
        console.log("Página está no ciclo. Próxima página será:", proximaPagina);

    } else {
        // CASO 2: A página atual NÃO ESTÁ na lista de rotação válida.
        // (Ex: estamos em /aviso-intervalo, mas já passou do tempo de exibi-la).
        // Para evitar erros, sempre volte para a primeira página do ciclo base.
        proximaPagina = paginasBase[0]; // Volta para a página "/"
        console.log("Página atual está FORA do ciclo. Voltando para a página inicial:", proximaPagina);
    }

    console.log(`Redirecionando para '${proximaPagina}' em ${tempoDeExibicao / 1000} segundos.`);

    // 5. AGENDAR O REDIRECIONAMENTO
    setTimeout(function() {
        window.location.href = proximaPagina;
    }, tempoDeExibicao);
});
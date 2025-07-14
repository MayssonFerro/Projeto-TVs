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
    // SEÇÃO 2: LÓGICA DA NOTÍCIA RÁPIDA
    // ======================================================
    const noticiaRapida = document.querySelector('.noticia-rapida');

    if (noticiaRapida) {
        // 1. Parâmetros da Animação
        const velocidadePixelsPorSegundo = 150;
        let posicaoAtual = parseFloat(localStorage.getItem('posicaoAtualNoticiaRapida')) || 0;
        let ultimoTimestamp = null;

        // 2. Função de Animação
        function animar(timestamp) {
            if (!ultimoTimestamp) {
                ultimoTimestamp = timestamp;
            }

            // Calcula quanto tempo passou desde o último frame
            const deltaTempoSegundos = (timestamp - ultimoTimestamp) / 1000;
            ultimoTimestamp = timestamp;

            // Move a posição para a esquerda
            posicaoAtual -= velocidadePixelsPorSegundo * deltaTempoSegundos;

            // Pega a largura total (elemento + tela) para saber quando reiniciar
            const larguraTotal = noticiaRapida.offsetWidth + window.innerWidth;

            // Se o elemento saiu completamente da tela, reinicia a posição
            if (posicaoAtual < -larguraTotal) {
                posicaoAtual = 0; // Reinicia do lado direito da tela
            }

            // Aplica a nova posição
            noticiaRapida.style.transform = `translateX(${posicaoAtual}px)`;

            // Continua o loop de animação
            requestAnimationFrame(animar);
        }

        // 3. Inicia a animação
        // Aplica a posição inicial antes de começar o loop
        noticiaRapida.style.transform = `translateX(${posicaoAtual}px)`;
        requestAnimationFrame(animar);

        // 4. Salva a posição EXATAMENTE antes de a página ser descarregada
        window.addEventListener('beforeunload', () => {
            // O valor de 'posicaoAtual' já está sempre atualizado pelo loop de animação
            localStorage.setItem('posicaoAtualNoticiaRapida', posicaoAtual);
        });
    }

    // ======================================================
    // SEÇÃO 3: ROTAÇÃO DE PÁGINAS
    // ======================================================
    const paginaAtualPath = window.location.pathname;

    // Verificar se deve desabilitar rotação para páginas administrativas
    const paginasAdministrativas = ['/admin', '/login', '/adicionar_dispositivo', '/listar_dispositivos', '/editar_dispositivo', '/publicacoes_ativas', '/editar_evento_imagem', '/editar_noticia', '/editar_evento_video'];
    if (paginasAdministrativas.some(pagina => paginaAtualPath.startsWith(pagina))) {
        
        // ======================================================
        // SEÇÃO 4: INICIALIZAÇÃO PARA PÁGINAS ADMINISTRATIVAS
        // ======================================================
        // Inicializar funções específicas baseadas na página atual
        
        // Só executar se estiver na página de adicionar conteúdo
        if (document.getElementById("tipo_conteudo")) {
            atualizarCamposConteudo();
            
            // Adicionar contadores para campos de conteúdo
            adicionarContadorCaracteres("conteudo_noticia", 150);
            adicionarContadorCaracteres("descricao_evento", 250);
            adicionarContadorCaracteres("descricao_evento_video", 250);
            adicionarContadorCaracteres("titulo_evento", 50);
            adicionarContadorCaracteres("titulo_evento_video", 50);
        }
        
        // Inicializar validação de IP (se estiver na página de adicionar dispositivo)
        const ipInput = document.getElementById('ip');
        if (ipInput) {
            ipInput.addEventListener('input', function(e) {
                const ip = e.target.value;
                const pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                
                if (ip && !pattern.test(ip)) {
                    e.target.style.borderColor = 'red';
                } else {
                    e.target.style.borderColor = '';
                }
            });
        }
        
        // Inicializar edição de dispositivo se estiver na página correta
        configurarEdicaoDispositivo();
        
        // Inicializar adição de dispositivo se estiver na página correta
        configurarAdicaoDispositivo();
        
        // Executar dicas de conexão se estiver na página de dispositivos
        if (paginaAtualPath.includes('/listar_dispositivos')) {
            setTimeout(mostrarDicasConexao, 500);
        }
        
        // Inicializar funcionalidades específicas para páginas de edição
        if (paginaAtualPath.includes('/editar_evento_imagem') || paginaAtualPath.includes('/editar_evento_video') || paginaAtualPath.includes('/editar_noticia')) {
            inicializarPaginasEdicao();
        }
        
        return; // Sai da função, não faz rotação
    }

    // 1. OBTER DADOS DO PYTHON
    let deveMostrarAviso = false;
    
    if (typeof window.SHOW_AVISO !== "undefined") {
        deveMostrarAviso = window.SHOW_AVISO;
    } else if (typeof SHOW_AVISO !== "undefined") {
        deveMostrarAviso = SHOW_AVISO;
    }
    
    console.log("Condição para mostrar a página de aviso:", deveMostrarAviso);

    // 2. MONTAR A LISTA DE PÁGINAS VÁLIDAS PARA ESTE MOMENTO
    const paginasBase = ['/', '/clima'];
    let paginasAtuais = [...paginasBase];

    if (deveMostrarAviso) {
        paginasAtuais.push('/aviso-intervalo');
    }

    // 3. DEFINIR TEMPO DE EXIBIÇÃO
    const tempoDeExibicao = 15000; // 15 segundos

    // 4. DECIDIR QUAL SERÁ A PRÓXIMA PÁGINA
    const indexDaPaginaAtual = paginasAtuais.indexOf(paginaAtualPath);

    let proximaPagina;

    if (indexDaPaginaAtual !== -1) {
        const indexDaProximaPagina = (indexDaPaginaAtual + 1) % paginasAtuais.length;
        proximaPagina = paginasAtuais[indexDaProximaPagina];
    } else {
        proximaPagina = paginasBase[0];
    }

    // 5. AGENDAR O REDIRECIONAMENTO
    setTimeout(function() {
        window.location.href = proximaPagina;
    }, tempoDeExibicao);

    // =========================
    // ROTAÇÃO DE EVENTOS PAINEL
    // =========================
    if (window.eventosPainel && window.eventosPainel.length > 0) {
        // Só mostra UM evento por vez, e avança a cada vez que a página '/' é exibida
        let idx = Number(localStorage.getItem('idxEventoPainel') || 0);
        if (isNaN(idx) || idx >= window.eventosPainel.length) idx = 0;

        const midiaContainer = document.getElementById('midia-container');
        const descricaoContainer = document.getElementById('descricao-container');
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';

        function mostrarEvento(i) {
            const ev = window.eventosPainel[i];
            midiaContainer.innerHTML = '';
            descricaoContainer.innerHTML = '';
            qrcodeDiv.innerHTML = '';

            if (ev.video) {
                midiaContainer.style.background = '';
                midiaContainer.style.backgroundImage = '';
                midiaContainer.innerHTML = `<video id="bg-video" autoplay loop muted playsinline style="width:100%;height:auto;">
                    <source src="${ev.video}" type="video/mp4">
                </video>`;
            } else if (ev.imagem) {
                midiaContainer.innerHTML = '';
                midiaContainer.style.backgroundImage = `url('${ev.imagem}')`;
                midiaContainer.style.backgroundSize = 'cover';
                midiaContainer.style.backgroundPosition = 'center';
                midiaContainer.style.backgroundRepeat = 'no-repeat';
            } else {
                midiaContainer.innerHTML = '';
                // Usar a cor de fundo personalizada do evento, ou cor padrão
                const corFundo = ev.cor_fundo || '#667eea';
                midiaContainer.style.background = `${corFundo}`;
                midiaContainer.style.backgroundImage = '';
            }

            // Só mostra título/descrição se houver descrição (para ambos imagem e vídeo)
            if (ev.titulo !== "Conteúdo - Imagem de fundo" && ev.descricao) {
                const tituloHTML = ev.titulo ? `<h2>${ev.titulo}</h2>` : '';
                const descricaoHTML = `<p>${ev.descricao}</p>`;
                
                descricaoContainer.innerHTML = tituloHTML + descricaoHTML;
                descricaoContainer.style.display = 'flex'; // Mostrar o container quando há conteúdo
            } else {
                descricaoContainer.innerHTML = '';
                descricaoContainer.style.display = 'none'; // Esconder quando não há conteúdo
            }

            if (ev.link) {
                qrcodeDiv.style.display = 'flex';
                new QRCode(qrcodeDiv, {
                    text: ev.link,
                    width: 128,
                    height: 128
                });
            } else {
                qrcodeDiv.style.display = 'none';
            }
        }

        mostrarEvento(idx);

        // Atualiza o índice para o próximo ciclo
        idx = (idx + 1) % window.eventosPainel.length;
        localStorage.setItem('idxEventoPainel', idx);
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'F2') {
        window.location.href = "/login";
    }
});

function previewImagem(input) {
  const uploadArea = document.querySelector('.upload-area');
  const container = document.getElementById("preview-container");
  
  if (!uploadArea || !container) return;
  
  // Remove qualquer preview anterior
  container.innerHTML = "";
  
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "preview-imagem";
      img.alt = "Preview da imagem";
      
      // Adiciona a imagem no container
      container.appendChild(img);
      
      // Adiciona classe para esconder o conteúdo de upload
      uploadArea.classList.add('has-image');
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    // Remove a classe se não há imagem
    uploadArea.classList.remove('has-image');
  }
}

// Função melhorada para preview
function previewImagem(input) {
    if (!input || !input.files) return;
    
    const file = input.files[0];
    const uploadArea = document.getElementById('upload-area');
    const previewContainer = document.getElementById('preview-container');
    
    if (!uploadArea || !previewContainer) return;
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                uploadArea.classList.add('has-image');
                previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview" style="object-fit: contain; border-radius: 12px;">`;
            } catch (error) {
                console.error('Erro ao criar preview:', error);
            }
        };
        
        reader.readAsDataURL(file);
    }
}

// Função para preview de vídeo
function previewVideo(input) {
    if (!input || !input.files) return;
    
    const file = input.files[0];
    const uploadArea = document.getElementById('upload-area-video');
    const previewContainer = document.getElementById('preview-container-video');
    
    if (!uploadArea || !previewContainer) return;
    
    if (file && file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        
        try {
            uploadArea.classList.add('has-image'); // Usar a mesma classe para comportamento consistente
            previewContainer.innerHTML = `<video src="${url}" controls style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
                Seu navegador não suporta o elemento de vídeo.
            </video>`;
        } catch (error) {
            console.error('Erro ao criar preview de vídeo:', error);
        }
    }
}

function atualizarCamposConteudo() {
  const tipoElement = document.getElementById("tipo_conteudo");
  if (!tipoElement) return; // Sai se o elemento não existir
  
  const tipo = tipoElement.value;
  
  // Verificar se os elementos existem antes de tentar alterar
  const campoNoticia = document.getElementById("campo_noticia");
  const campoImagem = document.getElementById("campo_imagem");
  const campoVideo = document.getElementById("campo_video");
  
  // Campos que podem ter required
  const tituloImagem = document.getElementById("titulo_evento");
  const tituloVideo = document.getElementById("titulo_evento_video");
  const videoInput = document.getElementById("video");
  const conteudoNoticia = document.getElementById("conteudo_noticia");
  
  // Remover required de todos os campos primeiro
  if (tituloImagem) tituloImagem.removeAttribute('required');
  if (tituloVideo) tituloVideo.removeAttribute('required');
  if (videoInput) videoInput.removeAttribute('required');
  if (conteudoNoticia) conteudoNoticia.removeAttribute('required');
  
  // Mostrar/ocultar campos e adicionar required conforme necessário
  if (campoNoticia) {
    campoNoticia.style.display = tipo === "noticia" ? "block" : "none";
    if (tipo === "noticia" && conteudoNoticia) {
      conteudoNoticia.setAttribute('required', 'required');
    }
  }
  
  if (campoImagem) {
    campoImagem.style.display = tipo === "imagem" ? "grid" : "none";
    if (tipo === "imagem") {
      if (tituloImagem) tituloImagem.setAttribute('required', 'required');
      // Reset configuration flag
      const uploadArea = document.getElementById('upload-area');
      if (uploadArea) uploadArea.dataset.configured = 'false';
      setTimeout(() => {
        configurarUploadImagem();
      }, 100);
    }
  }
  
  if (campoVideo) {
    campoVideo.style.display = tipo === "video" ? "grid" : "none";
    if (tipo === "video") {
      if (tituloVideo) tituloVideo.setAttribute('required', 'required');
      if (videoInput) videoInput.setAttribute('required', 'required');
      // Reset configuration flag
      const uploadAreaVideo = document.getElementById('upload-area-video');
      if (uploadAreaVideo) uploadAreaVideo.dataset.configured = 'false';
      setTimeout(() => {
        configurarUploadVideo();
      }, 100);
    }
  }
}

function adicionarContadorCaracteres(elementId, maxLength) {
  const elemento = document.getElementById(elementId);
  if (elemento) {
    elemento.addEventListener("input", function (e) {
      const currentLength = e.target.value.length;
      const remaining = maxLength - currentLength;

      // Remove contador anterior se existir
      const existingCounter = e.target.parentNode.querySelector(".char-counter");
      if (existingCounter) {
        existingCounter.remove();
      }

      // Adiciona novo contador
      const counter = document.createElement("small");
      counter.className = "char-counter";
      counter.style.color = remaining < 20 ? "#dc3545" : "#666";
      counter.style.display = "block";
      counter.style.marginTop = "5px";
      counter.textContent = `${currentLength}/${maxLength} caracteres (${remaining} restantes)`;
      
      // Insere o contador logo após o elemento de input/textarea
      e.target.insertAdjacentElement('afterend', counter);
    });
  }
}

// Função para validar IP
function validarIP(ip) {
    const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
}

// Função para testar conexão com parâmetro IP
async function testarConexaoComIP(ip) {
    try {
        const response = await fetch(`/testar_dispositivo/${ip}`);
        const data = await response.json();
        
        if (data.sucesso) {
            mostrarResultadoTeste('✅ Dispositivo respondeu! Status: ' + data.status, true);
        } else {
            mostrarResultadoTeste('❌ Erro: ' + data.erro, false);
        }
        
        return data;
    } catch (error) {
        mostrarResultadoTeste('❌ Erro ao testar conexão: ' + error.message, false);
        throw error;
    }
}

function testarConexao() {
  const ip = document.getElementById('ip').value;
  if (!ip) {
    alert('Digite um IP primeiro!');
    return;
  }
  
  // Fazer requisição AJAX para testar a conexão
  fetch(`/testar_dispositivo/${ip}`)
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        alert('✅ Dispositivo respondeu! Status: ' + data.status);
      } else {
        alert('❌ Dispositivo não responde: ' + data.erro);
      }
    })
    .catch(error => {
      alert('❌ Erro ao testar conexão: ' + error);
    });
}

// Função para adição de dispositivo
function configurarAdicaoDispositivo() {
    const form = document.querySelector('form[action="/adicionar_dispositivo"]');
    const testarBtn = document.getElementById('testar-conexao');

    if (!form) return;

    // Configurar contadores de caracteres
    configurarContador('nome', 50);
    configurarContador('local', 50);
    configurarContador('observacoes', 500);

    // Testar conexão
    if (testarBtn) {
        testarBtn.addEventListener('click', function() {
            const ip = document.getElementById('ip').value;
            if (!ip) {
                mostrarResultadoTeste('Por favor, digite um IP primeiro.', false);
                return;
            }

            if (!validarIP(ip)) {
                mostrarResultadoTeste('Por favor, digite um IP válido.', false);
                return;
            }

            testarBtn.disabled = true;
            testarBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
            
            testarConexaoComIP(ip).finally(() => {
                testarBtn.disabled = false;
                testarBtn.innerHTML = '<i class="bx bx-search"></i>';
            });
        });
    }
}

// Função para edição de dispositivo
    function configurarEdicaoDispositivo() {
        const form = document.getElementById('editar-dispositivo-form');
        const testarBtn = document.getElementById('testar-conexao');
        const excluirBtn = document.getElementById('excluir-dispositivo');
        const modal = document.getElementById('modal-exclusao');
        const confirmarBtn = document.getElementById('confirmar-exclusao');
        const cancelarBtn = document.getElementById('cancelar-exclusao');

        if (!form) return;

        // Configurar contadores de caracteres
        configurarContador('nome', 50);
        configurarContador('local', 50);
        configurarContador('observacoes', 500);

        // Testar conexão
        if (testarBtn) {
            testarBtn.addEventListener('click', function() {
                const ip = document.getElementById('ip').value;
                if (!ip) {
                    mostrarResultadoTeste('Por favor, digite um IP primeiro.', false);
                    return;
                }

                if (!validarIP(ip)) {
                    mostrarResultadoTeste('Por favor, digite um IP válido.', false);
                    return;
                }

                testarBtn.disabled = true;
                testarBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
                
                testarConexaoComIP(ip).finally(() => {
                    testarBtn.disabled = false;
                    testarBtn.innerHTML = '<i class="bx bx-search"></i>';
                });
            });
        }

        // Submit do formulário
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const submitBtn = form.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';
            
            fetch(form.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.sucesso) {
                    alert('✅ ' + data.mensagem);
                    // Opcionalmente redirecionar ou atualizar a página
                    window.location.href = '/listar_dispositivos';
                } else {
                    alert('❌ ' + data.erro);
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('❌ Erro ao salvar dispositivo. Tente novamente.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = '💾 Salvar Alterações';
            });
        });

        // Modal de exclusão
        if (excluirBtn && modal) {
            excluirBtn.addEventListener('click', function() {
                modal.style.display = 'block';
            });

            cancelarBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });

            confirmarBtn.addEventListener('click', function() {
                const dispositivoId = form.action.split('/').pop();
                
                confirmarBtn.disabled = true;
                confirmarBtn.textContent = 'Excluindo...';
                
                fetch(`/excluir_dispositivo/${dispositivoId}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.sucesso) {
                        alert('✅ ' + data.mensagem);
                        window.location.href = '/listar_dispositivos';
                    } else {
                        alert('❌ ' + data.erro);
                        modal.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    alert('❌ Erro ao excluir dispositivo. Tente novamente.');
                    modal.style.display = 'none';
                })
                .finally(() => {
                    confirmarBtn.disabled = false;
                    confirmarBtn.textContent = 'Sim, Excluir';
                });
            });

            // Fechar modal clicando fora
            window.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    function mostrarResultadoTeste(mensagem, sucesso) {
        const resultado = document.getElementById('resultado-teste');
        if (resultado) {
            resultado.textContent = mensagem;
            resultado.className = 'teste-resultado ' + (sucesso ? 'sucesso' : 'erro');
            resultado.style.display = 'flex';
        }
    }

    // Função para configurar contadores existente
    function configurarContador(campoId, limite) {
        const campo = document.getElementById(campoId);
        const contador = document.getElementById(`contador-${campoId}`);
        
        if (campo && contador) {
            // Atualizar contador inicial
            const valorInicial = campo.value || '';
            contador.textContent = `${valorInicial.length}/${limite}`;
            
            campo.addEventListener('input', function() {
                const tamanho = this.value.length;
                contador.textContent = `${tamanho}/${limite}`;
                
                if (tamanho > limite * 0.8) {
                    contador.style.color = '#ff6b00';
                } else {
                    contador.style.color = '#666';
                }
            });
        }
    }

    // Função para testar dispositivo da lista
    window.testarDispositivo = function(ip, botao) {
        const botaoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = 'Testando...';
        
        fetch(`/testar_dispositivo/${ip}`)
        .then(response => response.json())
        .then(data => {
            if (data.sucesso) {
                botao.textContent = '✅ Online';
                botao.style.background = '#28a745';
                setTimeout(() => {
                    botao.textContent = botaoOriginal;
                    botao.style.background = '';
                    botao.disabled = false;
                }, 3000);
            } else {
                botao.textContent = '❌ Offline';
                botao.style.background = '#dc3545';
                setTimeout(() => {
                    botao.textContent = botaoOriginal;
                    botao.style.background = '';
                    botao.disabled = false;
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            botao.textContent = '❌ Erro';
            botao.style.background = '#dc3545';
            setTimeout(() => {
                botao.textContent = botaoOriginal;
                botao.style.background = '';
                botao.disabled = false;
            }, 3000);
        });
    };

    // Função para mostrar dicas sobre problemas de conexão
    function mostrarDicasConexao() {
        const deviceCards = document.querySelectorAll('.dispositivo-card.inativo');
        
        deviceCards.forEach(card => {
            const ip = card.querySelector('.info-row').textContent.match(/IP: (.+)/)?.[1];
            if (ip && (ip === '192.168.0.1' || ip.startsWith('192.168.0.'))) {
                const dica = document.createElement('div');
                dica.className = 'conexao-dica';
                dica.innerHTML = `
                    <small>💡 <strong>Dica:</strong> Este parece ser um IP de exemplo. 
                    <a href="#" onclick="alert('Para resolver:\\n1. Edite este dispositivo\\n2. Altere o IP para o endereço real do seu Raspberry Pi\\n3. Ou defina como inativo se não for usar')">
                        Como resolver?
                    </a></small>
                `;
                card.appendChild(dica);
            }
        });
    }

    // ======================================================
    // CONFIGURAÇÃO DE PÁGINAS ESPECÍFICAS
    // ======================================================
    
    // Verificar qual página estamos e inicializar as funções apropriadas
    if (document.getElementById('editar-dispositivo-form')) {
        configurarEdicaoDispositivo();
    }
    
    if (document.querySelector('form[action="/adicionar_dispositivo"]')) {
        configurarAdicaoDispositivo();
    }
    
    // Configurar toggle do exemplo na página de adicionar conteúdo
    if (document.getElementById('toggle-exemplo')) {
        configurarToggleExemplo();
    }
    
    // Configurar tipo de conteúdo
    const tipoConteudo = document.getElementById('tipo_conteudo');
    if (tipoConteudo) {
        tipoConteudo.addEventListener('change', atualizarCamposConteudo);
        // Chamar uma vez para configurar o estado inicial
        atualizarCamposConteudo();
    }
    
    // Upload será configurado apenas quando necessário pelo atualizarCamposConteudo()
    
    // Configurar validação do formulário de conteúdo (apenas uma vez)
    configurarValidacaoFormularioConteudo();

// Função para configurar o toggle do exemplo
function configurarToggleExemplo() {
    const toggleBtn = document.getElementById('toggle-exemplo');
    const exemploCard = document.getElementById('exemplo-card');
    const closeBtn = document.getElementById('exemplo-close');
    
    if (!toggleBtn || !exemploCard) return;
    
    try {
        // Abrir card ao clicar no botão
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleBtn.style.display = 'none';
            exemploCard.style.display = 'block';
            exemploCard.classList.add('show');
        });

        // Fechar card
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                exemploCard.style.display = 'none';
                exemploCard.classList.remove('show');
                toggleBtn.style.display = 'flex';
            });
        }

        // Fechar card ao clicar fora dele
        document.addEventListener('click', function(e) {
            if (exemploCard.style.display === 'block' && 
                !exemploCard.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                exemploCard.style.display = 'none';
                exemploCard.classList.remove('show');
                toggleBtn.style.display = 'flex';
            }
        });
        
        // Impedir que cliques dentro do card o fechem
        exemploCard.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    } catch (error) {
        console.error('Erro ao configurar toggle do exemplo:', error);
    }
}

// Função para configurar upload de imagem
function configurarUploadImagem() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('imagem');
    
    if (!uploadArea || !fileInput) {
        return;
    }

    // Verificar se já foi configurado
    if (uploadArea.dataset.configured === 'true') {
        return;
    }

    // Marcar como configurado
    uploadArea.dataset.configured = 'true';
    
    // Flag para prevenir múltiplos cliques
    let isProcessingClick = false;
    
    // Click para abrir seletor - versão simples
    uploadArea.addEventListener('click', function(e) {
        // Não processar cliques no próprio input
        if (e.target === fileInput) {
            return;
        }
        
        // Prevenir múltiplos cliques rapidamente
        if (isProcessingClick) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        isProcessingClick = true;
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
        
        // Reset flag após um pequeno delay
        setTimeout(() => {
            isProcessingClick = false;
        }, 100);
    });

    // Preview quando arquivo é selecionado
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            previewImagem(this);
        }
    });
}

// Função para configurar upload de vídeo
function configurarUploadVideo() {
    const uploadArea = document.getElementById('upload-area-video');
    const fileInput = document.getElementById('video');
    
    if (!uploadArea || !fileInput) {
        return;
    }

    // Verificar se já foi configurado
    if (uploadArea.dataset.configured === 'true') {
        return;
    }

    // Marcar como configurado
    uploadArea.dataset.configured = 'true';
    
    // Flag para prevenir múltiplos cliques
    let isProcessingClickVideo = false;
    
    // Click para abrir seletor
    uploadArea.addEventListener('click', function(e) {
        // Não processar cliques no próprio input
        if (e.target === fileInput) {
            return;
        }
        
        // Prevenir múltiplos cliques rapidamente
        if (isProcessingClickVideo) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        isProcessingClickVideo = true;
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
        
        // Reset flag após um pequeno delay
        setTimeout(() => {
            isProcessingClickVideo = false;
        }, 100);
    });

    // Preview quando arquivo é selecionado
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            previewVideo(this);
        }
    });

    // Drag & drop events
    newUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    newUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    newUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                newFileInput.files = files;
                previewVideo(newFileInput);
            } else {
                alert('Por favor, selecione apenas arquivos de vídeo.');
            }
        }
    });
}

// Função para preview de vídeo
function previewVideo(input) {
    if (!input || !input.files) return;
    
    const file = input.files[0];
    const uploadArea = document.getElementById('upload-area-video');
    const previewContainer = document.getElementById('preview-container-video');
    
    if (!uploadArea || !previewContainer) return;
    
    if (file && file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        
        try {
            uploadArea.classList.add('has-image'); // Usar a mesma classe para comportamento consistente
            previewContainer.innerHTML = `<video src="${url}" controls style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
                Seu navegador não suporta o elemento de vídeo.
            </video>`;
        } catch (error) {
            console.error('Erro ao criar preview de vídeo:', error);
        }
    }
}

// Validação do formulário de conteúdo
function configurarValidacaoFormularioConteudo() {
    const form = document.querySelector('form[action*="admin"]');
    if (!form) return;
    
    // Verificar se já foi configurado para evitar duplicação
    if (form.dataset.validacaoConfigurada) return;
    form.dataset.validacaoConfigurada = 'true';
    
    let formularioEnviado = false; // Flag para prevenir múltiplas submissões
    
    form.addEventListener('submit', function(e) {
        // Prevenir múltiplas submissões
        if (formularioEnviado) {
            e.preventDefault();
            return false;
        }
        
        const tipoConteudo = document.getElementById('tipo_conteudo');
        if (!tipoConteudo) return;
        
        // Validação específica para eventos do tipo "imagem"
        if (tipoConteudo.value === 'imagem') {
            const descricao = document.getElementById('descricao_evento');
            const imagemInput = document.getElementById('imagem');
            
            const temDescricao = descricao && descricao.value.trim() !== '';
            const temImagem = imagemInput && imagemInput.files && imagemInput.files.length > 0;
            
            if (!temDescricao && !temImagem) {
                e.preventDefault();
                alert('⚠️ Para eventos com imagem, você deve preencher pelo menos a descrição ou enviar uma imagem.');
                return false;
            }
        }
        
        // Marcar como enviado e desabilitar botão
        formularioEnviado = true;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Publicando...';
            
            // Adicionar classe visual
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
        
        // Re-habilitar após timeout longo (caso haja erro de rede)
        setTimeout(() => {
            formularioEnviado = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publicar Conteúdo';
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        }, 10000); // 10 segundos
    });
}

// ======================================================
// SEÇÃO: FUNCIONALIDADES PARA PÁGINAS DE EDIÇÃO
// ======================================================
// Esta seção centraliza todas as funcionalidades JavaScript 
// das páginas de edição: editar_evento_imagem.html, editar_evento_video.html, editar_noticia.html

// Função para contador de caracteres na descrição
function configurarContadorCaracteresEdicao() {
    // Contador para página de edição de imagem
    const descTextarea = document.getElementById('descricao_evento_imagem');
    const descCounter = document.getElementById('char-count-desc-img');
    
    if (descTextarea && descCounter) {
        descTextarea.addEventListener('input', function() {
            const count = this.value.length;
            descCounter.textContent = count;
            
            if (count > 160) {
                descCounter.style.color = '#e74c3c';
            } else if (count > 120) {
                descCounter.style.color = '#f39c12';
            } else {
                descCounter.style.color = '#27ae60';
            }
        });
    }
    
    // Contador para página de edição de vídeo
    const descVideoTextarea = document.getElementById('descricao_evento_video');
    if (descVideoTextarea) {
        descVideoTextarea.addEventListener('input', function() {
            const count = this.value.length;
            const maxLength = this.getAttribute('maxlength') || 250;
            
            // Se não houver span para mostrar o contador, criar um
            let counter = this.parentElement.querySelector('.char-count');
            if (!counter) {
                counter = document.createElement('small');
                counter.className = 'char-count';
                counter.innerHTML = `<span>0</span>/${maxLength} caracteres`;
                this.parentElement.appendChild(counter);
            }
            
            const span = counter.querySelector('span');
            if (span) {
                span.textContent = count;
                
                if (count > maxLength * 0.8) {
                    span.style.color = '#e74c3c';
                } else if (count > maxLength * 0.6) {
                    span.style.color = '#f39c12';
                } else {
                    span.style.color = '#27ae60';
                }
            }
        });
    }
    
    // Contador para página de edição de notícia
    const noticiaTextarea = document.getElementById('conteudo_noticia');
    const noticiaCounter = document.getElementById('char-count-noticia');
    
    if (noticiaTextarea && noticiaCounter) {
        noticiaTextarea.addEventListener('input', function() {
            const count = this.value.length;
            noticiaCounter.textContent = count;
            
            if (count > 200) {
                noticiaCounter.style.color = '#e74c3c';
            } else if (count > 150) {
                noticiaCounter.style.color = '#f39c12';
            } else {
                noticiaCounter.style.color = '#27ae60';
            }
        });
    }
}

// Função para configurar upload de imagem na página de edição
function configurarUploadImagemEdicao() {
    const uploadArea = document.getElementById('imageUpload');
    const fileInput = document.getElementById('imagem');
    const currentImageContainer = document.getElementById('current-image-container');
    const currentImagePreview = document.getElementById('current-image-preview');
    
    if (!uploadArea || !fileInput) return;

    // Click para abrir seletor
    uploadArea.addEventListener('click', function(e) {
        if (e.target === fileInput) return; // Evita duplo click
        fileInput.click();
    });

    // Preview quando arquivo é selecionado
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Se existe uma imagem atual, substitui ela
                    if (currentImagePreview) {
                        // Adiciona classe de loading para transição
                        currentImagePreview.classList.add('loading');
                        
                        setTimeout(() => {
                            currentImagePreview.src = e.target.result;
                            currentImagePreview.alt = "Nova imagem selecionada";
                            currentImagePreview.classList.remove('loading');
                            
                            // Destaca que a imagem foi alterada
                            if (currentImageContainer) {
                                currentImageContainer.classList.add('image-changed');
                                setTimeout(() => {
                                    currentImageContainer.classList.remove('image-changed');
                                }, 2000);
                            }
                        }, 150);
                    } else if (currentImageContainer) {
                        // Se não existe preview mas existe container, cria um novo
                        currentImageContainer.innerHTML = `<img src="${e.target.result}" class="preview-imagem" alt="Nova imagem selecionada" id="current-image-preview">`;
                        currentImageContainer.classList.add('image-changed');
                        setTimeout(() => {
                            currentImageContainer.classList.remove('image-changed');
                        }, 2000);
                    } else {
                        // Se não existe container, cria um novo antes da upload area
                        const newContainer = document.createElement('div');
                        newContainer.className = 'current-file image-changed';
                        newContainer.id = 'current-image-container';
                        newContainer.innerHTML = `<img src="${e.target.result}" class="preview-imagem" alt="Nova imagem selecionada" id="current-image-preview">`;
                        uploadArea.parentNode.insertBefore(newContainer, uploadArea);
                        setTimeout(() => {
                            newContainer.classList.remove('image-changed');
                        }, 2000);
                    }
                    
                    // Esconde/reduz o conteúdo da upload area
                    uploadArea.classList.add('has-image');
                };
                
                reader.readAsDataURL(file);
            } else {
                alert('Por favor, selecione apenas arquivos de imagem.');
            }
        }
    });

    // Drag & drop events
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                fileInput.files = files;
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            } else {
                alert('Por favor, selecione apenas arquivos de imagem.');
            }
        }
    });
}

// Função para configurar upload de vídeo na página de edição
function configurarUploadVideoEdicao() {
    const uploadArea = document.getElementById('upload-area-video');
    const fileInput = document.getElementById('video');
    const currentVideoInfo = document.querySelector('.current-file .video-info');
    
    if (!uploadArea || !fileInput) return;

    // Click para abrir seletor
    uploadArea.addEventListener('click', function(e) {
        if (e.target === fileInput) return; // Evita duplo click
        fileInput.click();
    });

    // Preview quando arquivo é selecionado
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            if (file.type.startsWith('video/')) {
                // Atualizar informações do vídeo atual
                if (currentVideoInfo) {
                    currentVideoInfo.innerHTML = `<span>${file.name}</span>`;
                    currentVideoInfo.parentElement.classList.add('image-changed');
                    setTimeout(() => {
                        currentVideoInfo.parentElement.classList.remove('image-changed');
                    }, 2000);
                }
                
                // Criar preview do vídeo
                const previewContainer = document.getElementById('preview-container-video');
                if (previewContainer) {
                    const url = URL.createObjectURL(file);
                    previewContainer.innerHTML = `<video src="${url}" controls style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
                        Seu navegador não suporta o elemento de vídeo.
                    </video>`;
                }
                
                // Reduzir área de upload
                uploadArea.classList.add('has-image');
            } else {
                alert('Por favor, selecione apenas arquivos de vídeo.');
            }
        }
    });

    // Drag & drop events
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                fileInput.files = files;
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            } else {
                alert('Por favor, selecione apenas arquivos de vídeo.');
            }
        }
    });
}

// Função para inicializar funcionalidades das páginas de edição
function inicializarPaginasEdicao() {
    // Configurar contador de caracteres
    configurarContadorCaracteresEdicao();
    
    // Configurar upload de imagem
    configurarUploadImagemEdicao();
    
    // Configurar upload de vídeo
    configurarUploadVideoEdicao();
    
    // Se já existe uma imagem, reduz a área de upload
    const currentImage = document.getElementById('current-image-preview');
    const uploadArea = document.getElementById('imageUpload');
    
    if (currentImage && uploadArea) {
        uploadArea.classList.add('has-image');
    }
    
    // Se já existe um vídeo, reduz a área de upload de vídeo
    const currentVideoInfo = document.querySelector('.current-file .video-info');
    const uploadAreaVideo = document.getElementById('upload-area-video');
    if (currentVideoInfo && uploadAreaVideo) {
        uploadAreaVideo.classList.add('has-image');
    }
}

// ======================================================
// FUNÇÃO PARA CONFIRMAR EXCLUSÃO
// ======================================================
function confirmarExclusao(id, tipo) {
    let tipoTexto = '';
    let rota = '';
    
    switch(tipo) {
        case 'evento_imagem':
        case 'evento_video':
            tipoTexto = 'evento';
            rota = '/excluir_evento/';
            break;
        case 'noticia':
            tipoTexto = 'notícia';
            rota = '/excluir_noticia/';
            break;
        default:
            console.error('Tipo de exclusão não reconhecido:', tipo);
            return;
    }
    
    const confirmacao = confirm(`Tem certeza que deseja apagar este ${tipoTexto}?\n\nEsta ação não pode ser desfeita.`);
    
    if (confirmacao) {
        // Cria um formulário para fazer a requisição POST
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = rota + id;
        
        // Adiciona o token CSRF se necessário (dependendo da implementação do Flask)
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'csrf_token';
            tokenInput.value = csrfToken.getAttribute('content');
            form.appendChild(tokenInput);
        }
        
        document.body.appendChild(form);
        form.submit();
    }
}
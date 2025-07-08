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
    // SEÇÃO 2: LÓGICA DA NOTÍCIA RÁPIDA (MÉTODO ROBUSTO)
    // ======================================================
    const noticiaRapida = document.querySelector('.noticia-rapida');

    if (noticiaRapida) {
        // 1. Parâmetros da Animação
        const velocidadePixelsPorSegundo = 150; // Ajuste a velocidade conforme necessário
        let posicaoAtual = parseFloat(localStorage.getItem('posicaoAtualNoticiaRapida')) || 0;
        let ultimoTimestamp = null;

        // 2. Função de Animação (o coração da lógica)
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
    // SEÇÃO 3: ROTAÇÃO DE PÁGINAS (se necessário)
    // ======================================================
    const paginaAtualPath = window.location.pathname;
    console.log("--- Iniciando Script de Rotação de Página ---");
    console.log("Página atual:", paginaAtualPath);

    // Verificar se deve desabilitar rotação para páginas administrativas
    const paginasAdministrativas = ['/admin', '/login', '/adicionar_dispositivo', '/listar_dispositivos', '/editar_dispositivo'];
    if (paginasAdministrativas.some(pagina => paginaAtualPath.startsWith(pagina))) {
        console.log("Página administrativa detectada. Rotação de página desabilitada.");
        
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
        
        // Executar dicas de conexão se estiver na página de dispositivos
        if (paginaAtualPath.includes('/listar_dispositivos')) {
            setTimeout(mostrarDicasConexao, 500);
        }
        
        return; // Sai da função, não faz rotação
    }

    // 1. OBTER DADOS DO PYTHON - Com fallback seguro
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
    console.log("Lista de páginas na rotação atual:", paginasAtuais);

    // 3. DEFINIR TEMPO DE EXIBIÇÃO
    const tempoDeExibicao = 15000; // 15 segundos

    // 4. DECIDIR QUAL SERÁ A PRÓXIMA PÁGINA
    const indexDaPaginaAtual = paginasAtuais.indexOf(paginaAtualPath);
    console.log("Índice da página atual na lista:", indexDaPaginaAtual);

    let proximaPagina;

    if (indexDaPaginaAtual !== -1) {
        const indexDaProximaPagina = (indexDaPaginaAtual + 1) % paginasAtuais.length;
        proximaPagina = paginasAtuais[indexDaProximaPagina];
        console.log("Página está no ciclo. Próxima página será:", proximaPagina);
    } else {
        proximaPagina = paginasBase[0];
        console.log("Página atual está FORA do ciclo. Voltando para a página inicial:", proximaPagina);
    }

    console.log(`Redirecionando para '${proximaPagina}' em ${tempoDeExibicao / 1000} segundos.`);

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
                midiaContainer.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                midiaContainer.style.backgroundImage = '';
            }

            if (ev.titulo !== "Conteúdo - Imagem de fundo") {
                descricaoContainer.innerHTML = `<h2>${ev.titulo || ''}</h2><p>${ev.descricao || ''}</p>`;
            } else {
                descricaoContainer.innerHTML = '';
            }

            if (ev.link) {
                qrcodeDiv.style.display = 'block';
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
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        window.location.href = "/login";
    }
});

function previewImagem(input) {
  const container = document.getElementById("preview-container");
  container.innerHTML = "";

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "preview-imagem";
      img.alt = "Preview da imagem";
      container.appendChild(img);
    };
    reader.readAsDataURL(input.files[0]);
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
  
  if (campoNoticia) {
    campoNoticia.style.display = tipo === "noticia" ? "block" : "none";
  }
  
  if (campoImagem) {
    campoImagem.style.display = tipo === "imagem" ? "block" : "none";
  }
  
  if (campoVideo) {
    campoVideo.style.display = tipo === "video" ? "block" : "none";
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
                testarBtn.textContent = 'Testando...';
                
                testarConexao(ip).finally(() => {
                    testarBtn.disabled = false;
                    testarBtn.textContent = 'Testar Conexão';
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
        }
    }

    // Função para configurar contadores existente, mas vou atualizar para funcionar na página de edição
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
# Sistema de Gerenciamento de TVs - IFMS

Sistema web para gerenciamento e distribuição de conteúdo para múltiplas TVs/monitores em ambiente educacional, desenvolvido especificamente para o Instituto Federal de Mato Grosso do Sul (IFMS).

## 🎯 Objetivo

O sistema permite o controle centralizado de conteúdo exibido em TVs distribuídas pela instituição, facilitando a comunicação interna e divulgação de informações importantes como avisos de intervalos, eventos, notícias e previsão do tempo.

## 🚀 Funcionalidades

### 📺 Gerenciamento de Dispositivos
- **Cadastro de TVs**: Registro de dispositivos com nome, localização e IP
- **Monitoramento de Status**: Verificação do status de cada TV (Ativo/Inativo/Manutenção)
- **Teste de Conexão**: Verificação automática de conectividade com os dispositivos
- **Controle Remoto**: Envio de comandos para atualizar conteúdo remotamente

### 📝 Tipos de Conteúdo
- **Notícias Rápidas**: Textos que aparecem na barra inferior das telas
- **Eventos com Imagem**: Publicações com imagens, título, descrição e QR Code
- **Eventos com Vídeo**: Publicações com vídeos, título, descrição e QR Code
- **Agendamento**: Possibilidade de programar início e fim das publicações

### 🌤️ Integração com Clima
- **Previsão do Tempo**: Exibição automática da previsão para Três Lagoas-MS
- **Atualização Automática**: Dados atualizados em horários programados
- **Interface Visual**: Design moderno com ícones e informações detalhadas

### ⏰ Sistema de Intervalos
- **Avisos Automáticos**: Notificações de intervalos com antecedência configurável
- **Múltiplos Turnos**: Suporte para turnos manhã, tarde e noite
- **Contagem Regressiva**: Timer em tempo real para intervalos ativos
- **Horários Personalizáveis**: Configuração flexível de horários por turno

### 🔒 Sistema de Autenticação
- **Login Seguro**: Acesso controlado ao painel administrativo
- **Gerenciamento de Sessões**: Controle de acesso com Flask-Login
- **Área Administrativa**: Interface dedicada para gestão de conteúdo

## 🛠️ Tecnologias Utilizadas

### Backend
- **Flask**: Framework web Python
- **SQLAlchemy**: ORM para banco de dados
- **APScheduler**: Agendamento de tarefas automáticas
- **SQLite**: Banco de dados local

### Frontend
- **HTML5/CSS3**: Interface responsiva e moderna
- **JavaScript**: Funcionalidades interativas
- **Boxicons**: Ícones modernos
- **QR Code.js**: Geração de códigos QR

### Integrações
- **OpenWeatherMap API**: Dados meteorológicos
- **Requests**: Comunicação HTTP com dispositivos
- **Subprocess**: Testes de conectividade (ping)

## 🏗️ Arquitetura do Sistema

### Estrutura de Pastas
```
Projeto-TVs/
├── app.py              # Aplicação principal Flask
├── requirements.txt    # Dependências Python
├── clima.json         # Cache de dados meteorológicos
├── instance/
│   └── dispositivos.db # Banco de dados SQLite
├── static/
│   ├── css/           # Folhas de estilo
│   ├── images/        # Imagens do sistema
│   └── script.js      # JavaScript principal
└── templates/         # Templates HTML
    ├── clima.html
    ├── painel.html
    ├── login.html
    └── gerenciador_deconteudo/
```

### Banco de Dados
- **Dispositivos**: Informações das TVs cadastradas
- **Eventos**: Conteúdo programado (imagens/vídeos)
- **Notícias**: Texto para barra de notícias rápidas
- **Usuários**: Sistema de autenticação

## 🎨 Interface

### Painel Público
- **Rotação Automática**: Alternância entre páginas (clima, avisos, eventos)
- **Design Responsivo**: Adaptável a diferentes resoluções
- **Modo Tela Cheia**: Otimizado para TVs e monitores grandes
- **Atalhos**: Tecla F2 para acesso rápido ao login

### Painel Administrativo
- **Dashboard Intuitivo**: Interface amigável para gestão
- **Formulários Validados**: Campos com validação em tempo real
- **Feedback Visual**: Mensagens de sucesso/erro claras
- **Navegação Simplificada**: Botões flutuantes e menus organizados

## 📋 Pré-requisitos

- Python 3.7+
- Rede local para comunicação com as TVs
- Dispositivos compatíveis (Raspberry Pi recomendado)
- Acesso à internet para dados meteorológicos

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/Projeto-TVs.git
cd Projeto-TVs
```

2. **Instale as dependências**
```bash
pip install -r requirements.txt
```

3. **Configure a API do clima**
   - Obtenha uma chave da OpenWeatherMap
   - Edite a variável `api_key` no arquivo `app.py`

4. **Execute o sistema**
```bash
python app.py
```

5. **Acesse o sistema**
   - Painel público: `http://localhost:5000`
   - Área administrativa: `http://localhost:5000/login` (ou F2)
   - Login atual: admin@example.com
   - Senha: admin

## 🔧 Configuração

### Horários de Intervalo
Edite o dicionário `HORARIOS_EVENTOS` em `app.py` para ajustar os horários conforme sua instituição:

```python
HORARIOS_EVENTOS = {
    "primeiro intervalo": {
        'inicio': time(9, 15),
        'duracao': timedelta(minutes=20),
        'tipo': 'intervalo',
        'turno': 'manha'
    },
    # Adicione mais horários conforme necessário
}
```

### Dispositivos de Destino
Configure os Raspberry Pi ou dispositivos similares para receber comandos HTTP na porta 5000.

## 📱 Uso

1. **Cadastre as TVs** no painel administrativo
2. **Teste a conectividade** com cada dispositivo
3. **Crie conteúdo** (notícias, eventos, imagens)
4. **Agende publicações** conforme necessário
5. **Monitore o status** das TVs regularmente

## 🔍 Recursos Avançados

- **Rotação Inteligente**: Sistema que alterna entre diferentes páginas automaticamente
- **Cache Otimizado**: Dados meteorológicos salvos localmente para performance
- **Sistema de Ping**: Verificação automática de conectividade
- **Agendamento Flexível**: Publicações com data/hora de início e fim
- **Múltiplos Formatos**: Suporte para imagens, vídeos e texto
- **QR Codes**: Geração automática para links externos

## 👥 Contribuição

Este projeto foi desenvolvido para uso interno do IFMS, mas contribuições são bem-vindas para melhorias e novas funcionalidades.

## 📄 Licença

Projeto desenvolvido para uso educacional no Instituto Federal de Mato Grosso do Sul.

---

**Desenvolvido com ❤️ para o IFMS - Campus Três Lagoas**

*Criado por: Maysson Alexandre de Oliveira Ferro, Gerson Bruno de Jesus Florencio e Victor Hugo Ribeiro dos Santos Azambuja Primo - TADS IFMS, 2025*
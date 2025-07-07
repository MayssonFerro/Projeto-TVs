import json
import os
import requests
import subprocess
from flask import Flask, render_template, request, redirect, flash, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, login_required, logout_user, current_user, UserMixin
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, time, timedelta
from werkzeug.utils import secure_filename
import uuid
from sqlalchemy import or_, and_

app = Flask(__name__)
app.secret_key = 'uma_chave_muito_secreta_aqui'

api_key = '4cd224af1c46c58cf99cdbd798e13931'
city = 'Três Lagoas, br'
CACHE_FILE = 'clima.json'

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# --- SEÇÃO DE CONFIGURAÇÃO DE INTERVALOS ---
DURACAO_INTERVALO = timedelta(minutes=20)
AVISO_ANTECIPADO = timedelta(minutes=15)  # Tempo de antecedência para avisos
AVISO_FIM = timedelta(minutes=5)          # Aviso antes do fim do intervalo

      

HORARIOS_EVENTOS = {
    # MANHÃ
    "primeiro intervalo": {
        'inicio': time(9, 15), 
        'duracao': DURACAO_INTERVALO,
        'tipo': 'intervalo',
        'turno': 'manha'
    },
    
    # TARDE
    "intervalo da tarde": {
        'inicio': time(15, 15), 
        'duracao': DURACAO_INTERVALO,  # 15:15 às 15:35
        'tipo': 'intervalo',
        'turno': 'tarde'
    },
    
    # NOITE
    "intervalo da noite": {
        'inicio': time(21, 5), 
        'duracao': DURACAO_INTERVALO,  # 21:05 às 21:25
        'tipo': 'intervalo',
        'turno': 'noite'
    },
    
    # SAÍDAS (opcional - para avisos de final de turno)
    "saída manhã": {
        'inicio': time(12, 35), 
        'duracao': timedelta(minutes=0),
        'tipo': 'saida',
        'turno': 'manha'
    },
    "saída tarde": {
        'inicio': time(18, 35), 
        'duracao': timedelta(minutes=0),
        'tipo': 'saida',
        'turno': 'tarde'
    },
    "saída noite": {
        'inicio': time(22, 50), 
        'duracao': timedelta(minutes=0),
        'tipo': 'saida',
        'turno': 'noite'
    }
}

def get_turno_atual(hora_atual):
    """Determina qual turno está ativo baseado no horário"""
    if time(7, 0) <= hora_atual < time(12, 30):
        return 'manha'
    elif time(13, 0) <= hora_atual < time(18, 50):
        return 'tarde'
    elif time(18, 50) <= hora_atual <= time(23, 59) or time(0, 0) <= hora_atual < time(1, 0):
        return 'noite'
    else:
        return None  # Fora do horário escolar

def get_status_intervalo():
    """
    Verifica o horário atual e retorna o status do próximo evento.
    """
    print(f"\n=== DEBUG GET_STATUS_INTERVALO ===")
    agora_dt = datetime.now()
    hoje = agora_dt.date()
    turno_atual = get_turno_atual(agora_dt.time())
    
    print(f"Hora atual: {agora_dt}")
    print(f"Turno atual: {turno_atual}")
    
    # Filtrar eventos apenas do turno atual ou sem turno específico
    eventos_do_turno = {
        nome: detalhes for nome, detalhes in HORARIOS_EVENTOS.items()
        if detalhes.get('turno') == turno_atual or detalhes.get('turno') is None
    }
    
    # Ordena eventos por horário
    eventos_ordenados = sorted(eventos_do_turno.items(), key=lambda item: item[1]['inicio'])
    print(f"Eventos do turno ordenados: {[(nome, det['inicio']) for nome, det in eventos_ordenados]}")
    
    for nome, detalhes in eventos_ordenados:
        inicio_dt = datetime.combine(hoje, detalhes['inicio'])
        fim_dt = inicio_dt + detalhes['duracao']
        
        tempo_para_inicio = inicio_dt - agora_dt
        tempo_para_fim = fim_dt - agora_dt
        
        print(f"\n--- Verificando: {nome} ({detalhes.get('turno', 'geral')}) ---")
        print(f"Início: {inicio_dt.strftime('%H:%M')}")
        print(f"Fim: {fim_dt.strftime('%H:%M')}")
        print(f"Tempo para início: {tempo_para_inicio}")
        print(f"Tempo para fim: {tempo_para_fim}")
        
        # CONDIÇÃO 1: Avisar 15 minutos antes do INÍCIO
        if timedelta(seconds=0) <= tempo_para_inicio <= AVISO_ANTECIPADO:
            minutos = int(tempo_para_inicio.total_seconds() // 60)
            resultado = {
                "show_aviso": True,
                "mensagem_status": f"{nome.title()} em {minutos} minutos",
                "tempo_restante_segundos": tempo_para_inicio.total_seconds(),
                "tipo_evento": "aviso_inicio",
                "turno": detalhes.get('turno', 'geral')
            }
            print(f"RETORNANDO (aviso início): {resultado}")
            return resultado
        
        # CONDIÇÃO 2: DURANTE o intervalo
        if tempo_para_inicio <= timedelta(seconds=0) <= tempo_para_fim and detalhes['tipo'] == 'intervalo':
            minutos = int(tempo_para_fim.total_seconds() // 60)
            
            # Se faltam 5 minutos ou menos para terminar
            if tempo_para_fim <= AVISO_FIM:
                resultado = {
                    "show_aviso": True,
                    "mensagem_status": f"O intervalo termina em {minutos} minutos",
                    "tempo_restante_segundos": tempo_para_fim.total_seconds(),
                    "tipo_evento": "fim_intervalo",
                    "turno": detalhes.get('turno', 'geral')
                }
                print(f"RETORNANDO (fim intervalo): {resultado}")
                return resultado
            else:
                resultado = {
                    "show_aviso": True,
                    "mensagem_status": f"Intervalo em andamento. ({minutos}min restantes)",
                    "tempo_restante_segundos": tempo_para_fim.total_seconds(),
                    "tipo_evento": "durante_intervalo",
                    "turno": detalhes.get('turno', 'geral')
                }
                print(f"RETORNANDO (durante intervalo): {resultado}")
                return resultado
        
        # CONDIÇÃO 3: Avisar saída (5 min antes)
        if detalhes['tipo'] == 'saida' and timedelta(seconds=0) <= tempo_para_inicio <= timedelta(minutes=5):
            minutos = int(tempo_para_inicio.total_seconds() // 60)
            resultado = {
                "show_aviso": True,
                "mensagem_status": f"Saída do turno {detalhes.get('turno', '')} em {minutos} minutos",
                "tempo_restante_segundos": tempo_para_inicio.total_seconds(),
                "tipo_evento": "aviso_saida",
                "turno": detalhes.get('turno', 'geral')
            }
            print(f"RETORNANDO (aviso saída): {resultado}")
            return resultado
    
    # Se chegou aqui, não há avisos ativos
    if agora_dt.weekday() >= 5:  # Final de semana
        resultado = {
            "show_aviso": False,
            "mensagem_status": "Bom final de semana!",
            "tempo_restante_segundos": None,
            "tipo_evento": "fim_de_semana",
            "turno": None
        }
    elif turno_atual is None:  # Fora do horário escolar
        resultado = {
            "show_aviso": False,
            "mensagem_status": "Escola fechada - Próximo turno: 7h (manhã)",
            "tempo_restante_segundos": None,
            "tipo_evento": "fora_horario",
            "turno": None
        }
    else:  # Horário normal de aula
        resultado = {
            "show_aviso": False,
            "mensagem_status": f"Aulas em andamento - Turno da {turno_atual}",
            "tempo_restante_segundos": None,
            "tipo_evento": "aula_normal",
            "turno": turno_atual
        }
    
    print(f"RETORNANDO (sem aviso): {resultado}")
    return resultado

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))


def fetch_and_cache_weather():
    print("--------------------------------------------------")
    print(f"AGENDADOR: Buscando dados de PREVISÃO para {city}...")
    url = f'https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={api_key}&units=metric&lang=pt_br'
    try:
        response = requests.get(url, verify=False)
        response.raise_for_status()
        dados_previsao = response.json()
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(dados_previsao, f, ensure_ascii=False, indent=4)
        print("AGENDADOR: Dados de previsão salvos com sucesso no cache!")
    except requests.exceptions.RequestException as e:
        print(f"!!!!!!!!!! AGENDADOR: Erro ao chamar a API: {e} !!!!!!!!!!!")
    print("--------------------------------------------------")
 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dispositivos_novo.db'
db = SQLAlchemy(app)


class Dispositivo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String(15), unique=True, nullable=False)
    nome = db.Column(db.String(50), nullable=False)
    local = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='ativo')  # ADICIONAR
    observacoes = db.Column(db.Text)  # ADICIONAR
    ultima_atualizacao = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    ultima_sincronizacao = db.Column(db.DateTime, default=datetime.now)
    ultima_conexao = db.Column(db.DateTime)  # ADICIONAR para testar_dispositivo


class Evento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey('dispositivo.id'), nullable=False)
    titulo = db.Column(db.String(50), nullable=False)
    descricao = db.Column(db.String(250), nullable=False)
    link = db.Column(db.String(250))
    imagem = db.Column(db.String(250))
    video = db.Column(db.String(250))  # <-- Adicione esta linha
    status = db.Column(db.String(20), nullable=False)
    data_inicio = db.Column(db.DateTime, default=datetime.now)
    data_fim = db.Column(db.DateTime)
    dispositivo = db.relationship('Dispositivo', backref=db.backref('eventos', lazy=True))


class Mensagem_Temporaria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey('dispositivo.id'), nullable=False)
    mensagem = db.Column(db.String(250), nullable=True)
    link = db.Column(db.String(250), nullable=True)
    prioridade = db.Column(db.String(20), nullable=False)
    data_inicio = db.Column(db.DateTime, default=datetime.now)
    data_fim = db.Column(db.DateTime)
    hora_fim = db.Column(db.Time)
    dispositivo = db.relationship('Dispositivo', backref=db.backref('mensagens_temporarias', lazy=True))


class Noticia(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dispositivo_id = db.Column(db.Integer, db.ForeignKey('dispositivo.id'), nullable=False)
    conteudo = db.Column(db.String(250), nullable=False)
    data_inicio = db.Column(db.DateTime, default=datetime.now)
    data_fim = db.Column(db.DateTime)
    status = db.Column(db.String(20), nullable=False)
    dispositivo = db.relationship('Dispositivo', backref=db.backref('noticias', lazy=True))


class Usuario(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.now)


with app.app_context():
    db.create_all()
    if not Usuario.query.filter_by(email='admin@example.com').first():
        admin_user = Usuario(nome='Admin', email='admin@example.com', senha='admin')
        db.session.add(admin_user)
        db.session.commit()
        
    if not Dispositivo.query.first():
        novo_dispositivo = Dispositivo(ip="192.168.0.1", nome="Painel Teste", local="Entrada")
        db.session.add(novo_dispositivo)
        db.session.commit()
    if not Noticia.query.first():
        nova_noticia = Noticia(dispositivo_id=1, conteudo="Sejam bem-vindos!", status="ativa")
        db.session.add(nova_noticia)
        db.session.commit()
    if not Evento.query.first():
        novo_evento = Evento(dispositivo_id=1, titulo="Início das Aulas", descricao="O ano letivo começa hoje.", status="ativo")
        db.session.add(novo_evento)
        db.session.commit()


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin'))
    if request.method == 'POST':
        email = request.form['email']
        senha = request.form['senha']
        user = Usuario.query.filter_by(email=email).first()
        if user and user.senha == senha:
            login_user(user)
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('admin'))
        else:
            flash('Email ou senha incorretos.', 'danger')
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash("Logout realizado com sucesso.", "info")
    return redirect(url_for('login'))

@app.route('/testar_sistema')
@login_required
def testar_sistema():
    try:
        # Testar conexão com banco
        usuarios = Usuario.query.count()
        dispositivos = Dispositivo.query.count()
        
        # Testar função de status
        status = get_status_intervalo()
        
        return {
            'status': 'OK',
            'usuarios': usuarios,
            'dispositivos': dispositivos,
            'show_aviso': status['show_aviso'],
            'turno_atual': status.get('turno'),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {'status': 'ERRO', 'erro': str(e)}

@app.route("/")
def show_painel():
    noticia = Noticia.query.filter_by(status='ativa').all()
    # Filtra eventos ativos com imagem ou vídeo não nulos e não vazios
    evento = Evento.query.filter(
        Evento.status == 'ativo',
        or_(
            and_(Evento.imagem != None, Evento.imagem != ""),
            and_(Evento.video != None, Evento.video != "")
        )
    ).order_by(Evento.data_inicio.desc()).all()
    
    print(f"DEBUG - Eventos encontrados: {len(evento)}")
    for e in evento:
        print(f"  - Evento: {e.titulo}, Imagem: {e.imagem}, Vídeo: {e.video}, Link: {e.link}")
    status_intervalo = get_status_intervalo()
    return render_template(
        "painel.html",
        noticia=noticia,
        evento=evento,
        **status_intervalo
    )


@app.route('/dispositivos')
@login_required
def show_dispositivos():
    dispositivos = Dispositivo.query.all()
    return render_template('dispositivos.html', dispositivos=dispositivos)


@app.route('/adicionar_dispositivo', methods=['GET', 'POST'])
@login_required
def adicionar_dispositivo():
    if request.method == 'POST':
        nome = request.form['nome']
        local = request.form['local']
        ip = request.form['ip']
        status = request.form['status']
        observacoes = request.form.get('observacoes', '')
        
        # Verificar se IP já existe
        dispositivo_existente = Dispositivo.query.filter_by(ip=ip).first()
        if dispositivo_existente:
            flash('Erro: Já existe um dispositivo com este IP!', 'error')
            return render_template('adicionar_dispositivo.html')
        
        # Criar novo dispositivo
        novo_dispositivo = Dispositivo(
            nome=nome,
            local=local,
            ip=ip,
            status=status,
            observacoes=observacoes
        )
        
        try:
            db.session.add(novo_dispositivo)
            db.session.commit()
            flash(f'Dispositivo {nome} adicionado com sucesso!', 'success')
            return redirect(url_for('listar_dispositivos'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erro ao adicionar dispositivo: {str(e)}', 'error')
    
    return render_template('gerenciador_deconteudo/adicionar_dispositivo.html')

@app.route('/listar_dispositivos')
@login_required
def listar_dispositivos():
    dispositivos = Dispositivo.query.all()
    return render_template('gerenciador_deconteudo/dispositivos.html', dispositivos=dispositivos)

@app.route('/testar_dispositivo/<ip>')
@login_required
def testar_dispositivo(ip):
    try:
        import subprocess
        result = subprocess.run(['ping', '-c', '1', '-W', '3', ip], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            # Atualizar última conexão
            dispositivo = Dispositivo.query.filter_by(ip=ip).first()
            if dispositivo:
                dispositivo.ultima_conexao = datetime.utcnow()
                db.session.commit()
            
            return jsonify({'sucesso': True, 'status': 'Online'})  # CORRIGIR
        else:
            return jsonify({'sucesso': False, 'erro': 'Dispositivo não responde ao ping'})  # CORRIGIR
    
    except Exception as e:
        return jsonify({'sucesso': False, 'erro': str(e)})  # CORRIGIR
    
@app.route('/enviar_conteudo/<int:dispositivo_id>')
@login_required
def enviar_conteudo(dispositivo_id):
    dispositivo = Dispositivo.query.get_or_404(dispositivo_id)
    
    # Aqui você pode enviar comandos específicos para o Raspberry Pi
    # Por exemplo, alterar qual página deve ser exibida
    try:
        # Exemplo: enviar comando HTTP para o Raspberry Pi
        url = f"http://{dispositivo.ip}:5000/atualizar_conteudo"
        data = {
            'pagina': request.args.get('pagina', '/'),
            'comando': request.args.get('comando', 'reload')
        }
        
        response = requests.post(url, json=data, timeout=5)
        
        if response.status_code == 200:
            flash(f'Conteúdo enviado para {dispositivo.nome}!', 'success')
        else:
            flash(f'Erro ao comunicar com {dispositivo.nome}', 'error')
    
    except Exception as e:
        flash(f'Erro de conexão com {dispositivo.nome}: {str(e)}', 'error')
    
    return redirect(url_for('listar_dispositivos'))

@app.route("/aviso-intervalo")
def aviso_intervalo():
    noticia = Noticia.query.filter_by(status="ativa").all()
    status_intervalo = get_status_intervalo()
    return render_template('aviso-intervalo.html', noticia=noticia, **status_intervalo)


horarios_agendados = [
    (6, 10), (8, 0), (12, 0), (13, 0), (15, 0),
    (17, 0), (18, 0), (19, 0), (21, 0), (22, 0), (22, 50)
]

scheduler = BackgroundScheduler(daemon=True)
for hora, minuto in horarios_agendados:
    scheduler.add_job(fetch_and_cache_weather, 'cron', hour=hora, minute=minuto)
scheduler.start()


@app.route('/admin', methods=['GET', 'POST'])
@login_required
def admin():
    if request.method == 'POST':
        print("=== DEBUG FORMULÁRIO ===")
        dispositivos_ids = request.form.getlist('dispositivos')
        conteudo_noticia = request.form.get('conteudo_noticia')
        link_qrcode = request.form.get('link_qrcode')

        print(f"Dispositivos selecionados: {dispositivos_ids}")
        print(f"Conteúdo notícia: '{conteudo_noticia}'")
        print(f"Link QR Code: '{link_qrcode}'")
        print(f"Arquivos recebidos: {list(request.files.keys())}")

        if not dispositivos_ids:
            flash("Você deve selecionar ao menos um dispositivo.", "danger")
            return redirect(url_for('admin'))

        # Processamento de imagem (se houver)
        imagem_filename = None
        if 'imagem' in request.files:
            file = request.files['imagem']
            print(f"Arquivo de imagem: {file}")
            print(f"Nome do arquivo: {file.filename}")
            if file and file.filename != '':
                print("Processando upload da imagem...")
                upload_folder = os.path.join(app.root_path, 'static', 'uploads')
                os.makedirs(upload_folder, exist_ok=True)
                print(f"Diretório de upload: {upload_folder}")
                
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4()}_{filename}"
                file_path = os.path.join(upload_folder, unique_filename)
                file.save(file_path)
                imagem_filename = f"uploads/{unique_filename}"
                print(f"Imagem salva como: {imagem_filename}")
            else:
                print("Nenhuma imagem foi enviada ou arquivo vazio")
        else:
            print("Campo 'imagem' não encontrado no formulário")

        print(f"Imagem final: {imagem_filename}")

        # Processamento de vídeo (se houver)
        video_filename = None
        if 'video' in request.files:
            video_file = request.files['video']
            if video_file and video_file.filename != '':
                upload_folder = os.path.join(app.root_path, 'static', 'uploads')
                os.makedirs(upload_folder, exist_ok=True)
                filename = secure_filename(video_file.filename)
                unique_filename = f"{uuid.uuid4()}_{filename}"
                file_path = os.path.join(upload_folder, unique_filename)
                video_file.save(file_path)
                video_filename = f"uploads/{unique_filename}"
                print(f"Vídeo salvo como: {video_filename}")
            else:
                print("Nenhum vídeo foi enviado ou arquivo vazio")
        else:
            print("Campo 'video' não encontrado no formulário")

        # Verificar se pelo menos uma coisa foi preenchida
        if not conteudo_noticia and not imagem_filename and not link_qrcode:
            print("ERRO: Nenhum conteúdo foi preenchido!")
            flash("Você deve adicionar pelo menos um conteúdo: texto, imagem ou link.", "danger")
            return redirect(url_for('admin'))

        for id_dispositivo in dispositivos_ids:
            print(f"Processando dispositivo {id_dispositivo}...")
            
            # Criar notícia APENAS se houver texto
            if conteudo_noticia:
                print("Criando notícia...")
                nova_noticia = Noticia(
                    conteudo=conteudo_noticia,
                    status="ativa",
                    dispositivo_id=id_dispositivo
                )
                db.session.add(nova_noticia)
            
            # Criar evento se houver imagem OU link
            if link_qrcode or imagem_filename or video_filename:
                print("Criando evento...")
                evento_qr = Evento(
                    dispositivo_id=id_dispositivo,
                    titulo="Conteúdo - " + (conteudo_noticia[:30] + "..." if conteudo_noticia and len(conteudo_noticia) > 30 else conteudo_noticia if conteudo_noticia else "Imagem de fundo"),
                    descricao="Conteúdo relacionado à publicação",
                    link=link_qrcode if link_qrcode else "",
                    imagem=imagem_filename if imagem_filename else "",
                    video=video_filename if video_filename else "",  # Adicionando o vídeo
                    status="ativo"
                )
                db.session.add(evento_qr)
                print(f"Evento criado: titulo='{evento_qr.titulo}', imagem='{evento_qr.imagem}', link='{evento_qr.link}'")
        
        try:
            db.session.commit()
            print("Dados salvos no banco com sucesso!")
            flash("Conteúdo adicionado com sucesso!", "success")
        except Exception as e:
            print(f"ERRO ao salvar no banco: {e}")
            db.session.rollback()
            flash(f"Erro ao salvar: {str(e)}", "danger")
            
        return redirect(url_for('admin'))

    # GET request - mostrar a página
    dispositivos = Dispositivo.query.order_by(Dispositivo.nome).all()
    noticias = Noticia.query.filter_by(status='ativa').all()
    eventos = Evento.query.filter_by(status='ativo').all()
    
    return render_template(
        "gerenciador_deconteudo/adicionar_conteudo.html", 
        dispositivos=dispositivos,
        noticias=noticias,
        eventos=eventos
    )


@app.route('/excluir_noticia/<int:id>', methods=['POST'])
@login_required
def excluir_noticia(id):
    noticia = Noticia.query.get_or_404(id)
    
    # Remover eventos relacionados (que começam com "QR Code -" OU "Conteúdo -")
    eventos_relacionados = Evento.query.filter(
        (Evento.titulo.like('QR Code -%') | Evento.titulo.like('Conteúdo -%')),
        Evento.dispositivo_id == noticia.dispositivo_id
    ).all()
    
    for evento in eventos_relacionados:
        # Remover arquivo de imagem se existir
        if evento.imagem:
            arquivo_path = os.path.join(app.root_path, 'static', evento.imagem)
            if os.path.exists(arquivo_path):
                try:
                    os.remove(arquivo_path)
                    print(f"Arquivo removido: {arquivo_path}")
                except Exception as e:
                    print(f"Erro ao remover arquivo: {e}")
        
        db.session.delete(evento)
    
    db.session.delete(noticia)
    db.session.commit()
    flash("Publicação excluída com sucesso!", "success")
    return redirect(url_for('admin'))

@app.route('/excluir_mensagem/<int:id>', methods=['POST'])
@login_required
def excluir_mensagem(id):
    mensagem = Mensagem_Temporaria.query.get_or_404(id)
    
    # Remover eventos QR relacionados (que começam com "QR Code -")
    eventos_qr = Evento.query.filter(
        Evento.titulo.like('QR Code -%'),
        Evento.data_inicio == mensagem.data_inicio,
        Evento.dispositivo_id == mensagem.dispositivo_id
    ).all()
    
    for evento_qr in eventos_qr:
        db.session.delete(evento_qr)
    
    # Remover arquivo de imagem se existir
    if mensagem.link:
        arquivo_path = os.path.join(app.root_path, 'static', mensagem.link)
        if os.path.exists(arquivo_path):
            os.remove(arquivo_path)
    
    db.session.delete(mensagem)
    db.session.commit()
    flash("Mensagem e QR Code relacionado excluídos com sucesso!", "success")
    return redirect(url_for('admin'))

@app.route('/clima')
def clima():
    status_intervalo = get_status_intervalo()
    clima_data = None
    erro_msg = None
    noticia = Noticia.query.all()
    evento = Evento.query.all()
    noticia = Noticia.query.all()
    evento = Evento.query.all()

    if not os.path.exists(CACHE_FILE):
        erro_msg = "Dados do clima ainda não disponíveis. Aguardando a primeira busca."
    else:
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                dados_previsao = json.load(f)

            primeira_previsao = dados_previsao['list'][0]
            clima_data = {
                'cidade': dados_previsao['city']['name'],
                'temperatura': f"{primeira_previsao['main']['temp']:.0f}",
                'condicao': primeira_previsao['weather'][0]['description'].capitalize(),
                'chance_chuva': int(primeira_previsao['pop'] * 100),
                'vento': round(primeira_previsao['wind']['speed'] * 3.6, 1),
                'icone': primeira_previsao['weather'][0]['icon'],
            }
        except (IOError, json.JSONDecodeError, KeyError) as e:
            print(f"Erro ao ler ou processar o arquivo de cache: {e}")
            erro_msg = "Ocorreu um erro ao carregar os dados do clima."
            
    return render_template(
        'clima.html',
        clima=clima_data,
        erro=erro_msg,
        noticia=noticia,
        evento=evento,
        **status_intervalo
    )


if __name__ == '__main__':
    print("Executando a busca inicial de clima antes de iniciar o servidor...")
    with app.app_context():
        fetch_and_cache_weather()
    app.run(debug=True, use_reloader=False)
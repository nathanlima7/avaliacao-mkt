const express = require('express');
const cors = require('cors');
const venom = require('venom-bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do seu número para envio das notas
// Formato: Código do País (55) + DDD + Número sem o hífen
const MEU_NUMERO_WHATSAPP = '5586999816098'; 

app.use(cors());
app.use(express.json());

let clientWhatsapp = null;

// Inicializa a sessão do WhatsApp Web
venom
  .create({
    session: 'quiz-session',
    multidevice: true,
    // Permite que o Puppeteer baixe e gerencie o próprio navegador Chromium
    autoClose: 0,
    options: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  })
  .then((client) => {
    clientWhatsapp = client;
    console.log('✓ Cliente WhatsApp conectado e pronto para uso!');
  })
  .catch((erro) => {
    console.error('Erro ao conectar ao WhatsApp:', erro);
  });

// Rota para verificação de status
app.get('/', (req, res) => {
  res.json({
    status: 'Servidor no ar',
    whatsappConectado: !!clientWhatsapp
  });
});

// Rota POST que recebe a nota do Frontend
app.post('/api/grade', async (req, res) => {
  const { nome, nota, porcentagem } = req.body;

  if (!nome || nota === undefined) {
    return res.status(400).json({ error: 'Parâmetros "nome" e "nota" são obrigatórios.' });
  }

  if (!clientWhatsapp) {
    return res.status(503).json({ error: 'Serviço do WhatsApp ainda está inicializando. Tente novamente em alguns segundos.' });
  }

  // Formatação do texto da mensagem
  const mensagem = `📌 *Nova Avaliação Recebida*\n\n` +
                   `👤 *Aluno:* ${nome}\n` +
                   `🎯 *Nota:* ${nota} / 10.0\n` +
                   `📊 *Aproveitamento:* ${porcentagem}%\n` +
                   `📅 *Data/Hora:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}`;

  try {
    const destino = `${MEU_NUMERO_WHATSAPP}@c.us`;
    await clientWhatsapp.sendText(destino, mensagem);

    console.log(`[SUCESSO] Nota enviada para WhatsApp: Aluno ${nome} (${nota} pts)`);
    return res.status(200).json({ success: true, message: 'Nota enviada para o WhatsApp com sucesso.' });
  } catch (error) {
    console.error('[ERRO] Falha ao enviar mensagem no WhatsApp:', error);
    return res.status(500).json({ error: 'Erro interno ao tentar enviar a mensagem via WhatsApp.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

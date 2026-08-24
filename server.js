const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));


// Permite a Express entender datos en formato JSON enviados desde el frontend
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// RUTAS HTTP: REGISTRO Y LOGIN
// ==========================================

// 1. Ruta para Registrar Usuarios
app.post('/api/registro', async (req, res) => {
  const { email, password, nickname } = req.body;

  try {
    // Comprobar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Crear el nuevo usuario con valores por defecto
    const nuevoUsuario = await prisma.usuario.create({
      data: { email, password, nickname }
    });

    res.status(201).json({ 
      mensaje: 'Usuario registrado con éxito',
      usuario: { nickname: nuevoUsuario.nickname, elo: nuevoUsuario.elo, monedas: nuevoUsuario.monedas }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al registrar.' });
  }
});

// 2. Ruta para Iniciar Sesión
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar al usuario por correo
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || usuario.password !== password) {
      return res.status(400).json({ error: 'Credenciales incorrectas.' });
    }

    // Devolver los datos del jugador si la contraseña coincide
    res.status(200).json({
      mensaje: 'Acceso concedido',
      usuario: { nickname: usuario.nickname, elo: usuario.elo, monedas: usuario.monedas }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// ==========================================
// WEBSOCKETS: MULTIJUGADOR, CHAT Y VOZ
// ==========================================
io.on('connection', (socket) => {
  let salaActual = null;

  socket.on('unirse_sala', (codigoSala) => {
    if (salaActual) socket.leave(salaActual);
    salaActual = codigoSala;
    socket.join(salaActual);
    socket.emit('sala_conectada', salaActual);
  });

  socket.on('mover_pieza', (movimiento) => {
    if (salaActual) socket.to(salaActual).emit('pieza_movida_rival', movimiento);
  });

  socket.on('enviar_mensaje_chat', (textoMsg) => {
    if (salaActual) socket.to(salaActual).emit('recibir_mensaje_chat', textoMsg);
  });

  socket.on('enviar_regalo', (monto) => {
    if (salaActual) socket.to(salaActual).emit('recibir_regalo', monto);
  });

  socket.on('enviar_nota_voz', (base64Audio) => {
    if (salaActual) socket.to(salaActual).emit('recibir_nota_voz', base64Audio);
  });

  socket.on('disconnect', () => {});
});

server.listen(PORT, () => console.log(`Servidor completo corriendo en http://localhost:${PORT}`));

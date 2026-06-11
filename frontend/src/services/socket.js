import { io } from 'socket.io-client'

let socket = null

export const initSocket = (userId) => {
  if (socket?.connected) return socket

  socket = io('/', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    if (userId) socket.emit('authenticate', userId)
  })

  socket.on('disconnect', () => console.log('Socket disconnected'))

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
}

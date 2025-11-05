/**
 * Configuración de despliegue para backend - Ejemplo
 * 
 * Copia este archivo a deploy.config.js y ajusta los valores según tu servidor
 */

module.exports = {
  // Información del servidor
  host: 'tu-servidor.com',           // IP o dominio del servidor
  user: 'usuario',                   // Usuario SSH
  remotePath: '/var/www/femimed-backend',  // Ruta en el servidor
  port: 22,                          // Puerto SSH
  
  // Método de despliegue: 'scp' o 'rsync'
  method: 'rsync',
  
  // Opciones adicionales
  options: {
    // Archivos a excluir del despliegue
    exclude: [
      'node_modules',
      'src',
      '*.ts',
      '*.map',
      '.git',
      '*.log',
      'config.env',
      'config.*.env',
      'migrations',
      'scripts'
    ],
    
    // Hacer backup antes de desplegar
    backup: true,
    backupPath: '/var/www/femimed-backend-backup'
  }
};


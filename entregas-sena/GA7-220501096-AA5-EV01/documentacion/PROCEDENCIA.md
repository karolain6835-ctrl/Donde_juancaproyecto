# Procedencia del código

Repositorio: https://github.com/karolain6835-ctrl/Donde_juancaproyecto

Referencia HEAD al preparar: `506ef2c717d6920f4c1b77999cf35337167f781e`. Los comentarios se añadieron en el árbol de trabajo, sin commit.

| Archivo de la entrega | Origen | Tratamiento |
|---|---|---|
| src/controllers/usuariosController.js | backend/src/controllers/usuariosController.js | Copia completa, con comentarios en español; lógica conservada |
| src/config/db.js | backend/src/config/db.js | Copia completa, con comentarios en español; lógica conservada |
| src/routes/loginRoutes.js | Declaración POST de backend/src/routes/usuariosRoutes.js | Montaje independiente de la misma función loginUsuario |
| src/index.js | Entrada académica | Carga entorno, procesa JSON y escucha HTTP; no implementa autenticación |
| package.json | backend/package.json | Conserva dependencias; solo incluye el script start académico |
| package-lock.json | backend/package-lock.json | Copia idéntica |
| database/esquema-login.sql | backend/database/v1.0_estructura.sql | Extrae roles y usuarios; cambia únicamente el nombre del esquema para aislar la entrega |
| .env.example | Variables utilizadas por db.js y loginUsuario | Plantilla sin credenciales ni secreto JWT |

## Huellas SHA-256 de archivos reutilizados

- `src/controllers/usuariosController.js`: `d562bb0704e6ba7ff4225bba5da74cb0c1398002919ffe8baeb2f0d1be58830c`
- `src/config/db.js`: `5ad1c9406f23394a17c4d99ba9ab9e9ad545b4ad14ac833fe33f8939d0a6ed5b`
- `package-lock.json`: `6bfc5b0363fddf2340bdc739a8ed55223197510a2d5533e12b53e46200fb1c84`

La comparación de árboles de sintaxis confirma que las modificaciones realizadas en los tres archivos originales son únicamente comentarios. Las copias del controlador y la conexión coinciden byte por byte con sus fuentes comentadas.

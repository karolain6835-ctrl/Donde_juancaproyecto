const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');

router.get('/', categoriasController.obtenerCategorias);

module.exports = router;
const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');
const permitir = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/dashboard.controller');
const estatisticas = require('../controllers/estatisticas.controller');
const { periodoQuery } = require('../schemas/dashboard.schema');

const router = Router();

// RF17 - restrito ao Administrador
router.use(autenticar, permitir('administrador'));

router.get('/visao-geral', validate(periodoQuery, 'query'), ctrl.visaoGeral);
router.get('/faturamento-mensal', ctrl.faturamentoMensal);
router.get('/status-pedidos', validate(periodoQuery, 'query'), ctrl.statusPedidos);
router.get('/top-produtos', validate(periodoQuery, 'query'), ctrl.topProdutos);

// Estatística descritiva (média, mediana, moda, desvio padrão) e desempenho por funcionário
router.get('/estatisticas', validate(periodoQuery, 'query'), estatisticas.estatisticas);
router.get('/equipe', validate(periodoQuery, 'query'), estatisticas.equipe);

module.exports = router;

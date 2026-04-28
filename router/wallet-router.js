const express         = require('express');
const router          = express.Router();
const authMiddleware  = require('../middleware/auth-middleware');
const walletController = require('../controllers/wallet-controller');

router.use(authMiddleware);

router.get('/',                      walletController.getWallet);
router.get('/transactions',          walletController.getTransactions);
router.post('/withdraw',             walletController.requestWithdrawal);
router.post('/withdraw-jazzcash',    walletController.requestJazzCashWithdrawal);
router.post('/pay-commission',       walletController.payCommission);
router.get('/withdrawals',           walletController.getWithdrawals);
router.get('/notifications',         walletController.getNotifications);
router.put('/notifications/read',    walletController.markNotificationsRead);

module.exports = router;

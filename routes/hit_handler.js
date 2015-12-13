var express = require('express');
var router = express.Router();

// Обрабатывание нового hit страницы
router.use(function(req, res, next) {
    var Client = require('pg-native');
    var conString = "postgres://danmir:@localhost/visits";
    var client = new Client();
    client.connect(conString, function (err) {
        if (err) {
            console.log(err);
        }
        client.query(
            'INSERT INTO hits (url, time) VALUES ($1::text, CURRENT_DATE)',
            [req.url], function (err, rows) {
                if (err) {
                    console.log(err);
                }
                next();
                client.end();
            });
    });
});

module.exports = router;
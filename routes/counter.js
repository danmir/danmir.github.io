var express = require('express');
var router = express.Router();

// Статистика hits по страницам
router.get('/', function(req, res, next) {
    var Client = require('pg-native');
    var conString = process.env.DATABASE_URL;;
    var client = new Client();
    client.connect(conString, function (err) {
        if (err) {
            console.log(err);
        }
        client.query(
            'SELECT count(*) AS n, url FROM hits GROUP BY url ORDER BY count(*) DESC', function (err, rows) {
                if (err) {
                    console.log(err);
                }
                res.render('counter', {counter: rows});
                client.end();
            })
    });
});

module.exports = router;

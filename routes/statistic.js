var express = require('express');
var app = require('../app.js');
var router = express.Router();
var pg = require('pg');
var conString = process.env.DATABASE_URL;

// Считаем различную статистику при загрузке страницы
router.use(function(req, res, next) {
    var Client = require('pg-native');
    var conString = process.env.DATABASE_URL;;
    var client = new Client();
    client.connect(conString, function (err) {
        if (err) {
            console.log(err);
        }
        // Посмотрим, сколько hits у запрошенной страницы
        // И сохраним для дальнейшей обработки запроса
        client.query(
            'SELECT count(*) AS n, url FROM hits WHERE url=$1::text GROUP BY url', [req.url],
            function (err, rows) {
                if (err) {
                    console.log(err);
                }
                req.app.locals.currPageHits = rows[0]['n'];
                // Посмотрим, сколько hits в общем
                client.query(
                    'SELECT count(*) AS n FROM hits',
                    function (err, rows) {
                        if (err) {
                            console.log(err);
                        }
                        req.app.locals.AllHits = rows[0]['n'];
                        // Посмотрим, сколько визитов в общем
                        client.query(
                            'SELECT sum(num) AS n FROM visits',
                            function (err, rows) {
                                if (err) {
                                    console.log(err);
                                }
                                req.app.locals.AllVisits = rows[0]['n'];
                                // Посмотрим количество hits за сегодня у всех страниц в сумме
                                client.query(
                                    'SELECT count(url) AS n FROM hits WHERE time=CURRENT_DATE',
                                    function (err, rows) {
                                        if (err) {
                                            console.log(err);
                                        }
                                        req.app.locals.todayHits = rows[0]['n'];
                                        // Посмотрим количество визитов за сегодня у всех страниц в сумме
                                        client.query(
                                            'SELECT count(ip) AS n FROM visits_time WHERE time=CURRENT_DATE',
                                            function (err, rows) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                                req.app.locals.todayVisits = rows[0]['n'];
                                                // Посмотрим последний хит этого пользователя
                                                client.query(
                                                    'SELECT time from visits WHERE ip=$1::text', [req.ip],
                                                    function (err, rows) {
                                                        if (err) {
                                                            console.log(err);
                                                        }
                                                        if (rows[0]) {
                                                            req.app.locals.lastVisit = new Date(rows[0].time);
                                                        } else {
                                                            req.app.locals.lastVisit = new Date();
                                                        }
                                                        next();
                                                        client.end();
                                                    });
                                            });
                                    });
                            });
                    })
            })
    });
});

module.exports = router;
var express = require('express');
var router = express.Router();
var allVisits = require('../get_statistic.js');
var pg = require('pg');
//var conString = "postgres://danmir:@localhost/visits";
var query = require('pg-query');
query.connectionParameters = process.env.DATABASE_URL;


router.use(function (req, res, next) {
    // Получаем настоящий адрес, внутри heroku
    var realIpAddr = req.headers["x-forwarded-for"];
    if (realIpAddr){
        var list = realIpAddr.split(",");
        realIpAddr = list[list.length-1];
    } else {
        realIpAddr = req.connection.remoteAddress;
    }
    query('SELECT ip, time from visits WHERE ip=$1::text', [req.ip], function(err, rows, result) {
        if(err) {
            return console.error('error running query', err);
        }
        // Если новый пользователь, занесем его в таблицу
        if (!result.rowCount) {
            query('INSERT INTO visits (time, ip, num) VALUES (extract(epoch from now()), $1::text, 1)', [realIpAddr], function(err, rows, result) {
                if(err) {
                    return console.error('error running query', err);
                }
                // Запишем еще время этого визита
                query('INSERT INTO visits_time (ip, time) VALUES ($1::text, CURRENT_DATE)', [realIpAddr], function(err, rows, result) {
                    if(err) {
                        return console.error('error running query', err);
                    }
                    next();
                });
            });
        } else {
           // Иначе это старый пользователь
           // Считаем, сколько прошло с его последнего визита
            query('SELECT id, ip, time, num, (extract(epoch from now()) - time) as delta from visits WHERE ip=$1::text', [realIpAddr], function(err, rows, result) {
                if(err) {
                    return console.error('error running query', err);
                }
                var timeSinceLastVisit = rows[0].delta;
                var ipId = rows[0]['id'];
                var ip = rows[0]['ip'];
                var countOfVisits = parseInt(rows[0].num, 10);
                // Обновим время последнего посещения
                query('UPDATE visits SET time = extract(epoch from now()) WHERE id = $1::integer', [ipId], function(err, rows, result) {
                    if(err) {
                        return console.error('error running query', err);
                    }
                });
                // 30 минут неактивности - новый визит
                if (timeSinceLastVisit >= 180000) {
                    query('UPDATE visits SET num = $1::integer WHERE id = $2::integer', [countOfVisits + 1, ipId], function(err, rows, result) {
                        if(err) {
                            return console.error('error running query', err);
                        }
                        // Запишем еще время этого визита
                        query('INSERT INTO visits_time (ip, time) VALUES ($1::text, CURRENT_DATE)', [ip], function(err, rows, result) {
                            if(err) {
                                return console.error('error running query', err);
                            }
                        });
                    });
                }
                // Слишком быстро запросы идут
                // Поставим timeout
                // Проверим, что это не ajax запрос
                var is_ajax_request = req.xhr;
                var isRedirect = req.app.locals.isRedirected || false;
                console.log('isRedirect', isRedirect);
                console.log('isXHR', is_ajax_request);
                if (timeSinceLastVisit <= 0.5 && !isRedirect && !is_ajax_request) {
                    console.log('Too fast');
                    res.render('hacker', {visits: allVisits});
                    return;
                }
                req.app.locals.isRedirected = false;
                next();
            });
        }
    });
});

//// Определение быстрых обращений к серверу
//router.use(function(req, res, next) {
//    pg.connect(conString, function(err, client, done) {
//        if(err) {
//            return console.error('could not connect to postgres', err);
//        }
//        client.query("SELECT ip, time from visits WHERE ip=$1::text", [req.ip], function(err, result) {
//            if(err) {
//                return console.error('error running query', err);
//            }
//            if (!result.rowCount) {
//                //console.log('Новый пользователь');
//                client.query("INSERT INTO visits (time, ip, num) VALUES (extract(epoch from now()),'" + req.ip + "', 1)", function(err, result) {
//                    if(err) {
//                        return console.error('error running query', err);
//                    }
//                    // Запишем еще время этого визита
//                    client.query("INSERT INTO visits_time (ip, time) VALUES ($1::text, CURRENT_DATE)", [req.ip], function(err, result) {
//                        if(err) {
//                            return console.error('error running query', err);
//                        }
//                        next();
//                        client.end();
//                    });
//                });
//            } else {
//                //console.log('Старый пользователь');
//                client.query("SELECT id, ip, time, num, (extract(epoch from now()) - time) as delta from visits WHERE ip='" + req.ip + "'", function(err, result) {
//                    if(err) {
//                        return console.error('error running query', err);
//                    }
//                    var timeSinceLastVisit = result.rows[0].delta;
//                    var ipId = result.rows[0]['id'];
//                    var ip = result.rows[0]['ip'];
//                    var countOfVisits = parseInt(result.rows[0].num, 10);
//                    //console.log(ipId, timeSinceLastVisit, countOfVisits);
//                    // Обновим время последнего посещения
//                    client.query("UPDATE visits SET time = extract(epoch from now()) WHERE id = " + ipId, function(err, result) {
//                        if(err) {
//                            return console.error('error running query', err);
//                        }
//                    });
//                    // 30 минут неактивности - новый визит
//                    if (timeSinceLastVisit >= 180000) {
//                        client.query("UPDATE visits SET num =" + (countOfVisits + 1) +  "WHERE id = " + ipId, function(err, result) {
//                            if(err) {
//                                return console.error('error running query', err);
//                            }
//                            // Запишем еще время этого визита
//                            client.query("INSERT INTO visits_time (ip, time) VALUES ($1::text, CURRENT_DATE)", [ip], function(err, result) {
//                                if(err) {
//                                    return console.error('error running query', err);
//                                }
//                                client.end();
//                            });
//                        });
//                    }
//                    // Слишком быстро запросы идут
//                    // Поставим timeout
//                    // Проверим, что это не ajax запрос
//                    var is_ajax_request = req.xhr;
//                    var isRedirect = req.app.locals.isRedirected || false;
//                    console.log('isRedirect', isRedirect);
//                    console.log('isXHR', is_ajax_request);
//                    if (timeSinceLastVisit <= 0.5 && !isRedirect && !is_ajax_request) {
//                        console.log('Too fast');
//                        res.render('hacker', {visits: allVisits});
//                        client.end();
//                        return;
//                    }
//                    req.app.locals.isRedirected = false;
//                    next();
//                });
//            }
//        });
//    });
//});

module.exports = router;
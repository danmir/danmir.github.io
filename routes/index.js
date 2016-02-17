var express = require('express');
var router = express.Router();
var Account = require('../models/user.js');
var passport = require('passport');
var genStatisticPic = require('../get_statistic.js');
var sanitizeHtml = require('sanitize-html');
var ensureLoggedIn = require('connect-ensure-login');
var fs = require("fs");
var handlebars = require('handlebars');
var layouts = require('handlebars-layouts');
var query = require('pg-query');

handlebars.registerHelper(layouts(handlebars));
handlebars.registerPartial('layout', fs.readFileSync('./views/mainlayout.hbs', 'utf8'));

// Страница с портфолио
router.get('/', function(req, res, next) {
    genStatisticPic(req.app.locals.todayVisits, req.app.locals.AllVisits, req.app.locals.todayHits, req.app.locals.AllHits);
    var template = handlebars.compile(fs.readFileSync('./views/portfolio.html', 'utf8'));
    var output = template({
        title: 'Портфолио',
        lastVisit: req.app.locals.lastVisit,
        user: req.user
    });
    return res.send(output);
});

// Галерея
router.get('/gallery', function(req, res, next) {
    genStatisticPic(req.app.locals.todayVisits, req.app.locals.AllVisits, req.app.locals.todayHits, req.app.locals.AllHits);
    var template = handlebars.compile(fs.readFileSync('./views/gallery.html', 'utf8'));
    var output = template({
        title: 'Галлерея',
        user: req.user,
        visitsToday: req.app.locals.todayVisits,
        visitsAll: req.app.locals.AllVisits,
        hitsToday: req.app.locals.todayHits,
        hitsAll: req.app.locals.AllHits,
        lastVisit: req.app.locals.lastVisit
    });
    return res.send(output);
});

// Комментарии для картинок
router.get('/comments/:id', function(req, res, next) {
        var Client = require('pg-native');
        var conString = process.env.DATABASE_URL;
        var client = new Client();
        if (req.user) {
            //console.log('id: ', req.params.id);
            client.connect(conString, function (err) {
                if (err) {
                    console.log(err);
                }
                client.query(
                    'SELECT id, comment, username, time FROM comments WHERE pic_id=$1::integer',
                    [req.params.id], function (err, rows) {
                        if (err) {
                            console.log(err);
                        }
                        //console.log(rows);
                        for (var i in rows) {
                            if (rows[i]['username'] === req.user.dataValues.username) {
                                rows[i]['mine'] = '1';
                            } else {
                                rows[i]['mine'] = '0';
                            }
                        }
                        res.writeHead(200, {"Content-Type": "application/json"});
                        var json = JSON.stringify({
                            comments: rows
                        });
                        res.end(json);
                        client.end();
                    })
            });
        } else {
            res.writeHead(200, {"Content-Type": "application/json"});
            var json = JSON.stringify({
                error: 'not registered'
            });
            res.end(json);
            client.end();
        }
});

// Отправка комментария на сервер
router.use('/comments', function(req, res, next) {
    var Client = require('pg-native');
    var conString = process.env.DATABASE_URL;
    var client = new Client();
    if (req.user) {
        client.connect(conString, function(err) {
            if (err) {
                console.log(err);
            }
            console.log('Комментарий на сервере', req.body);
            //var comment = sanitizeHtml(req.body.comment);
            var comment = sanitizeHtml(req.body.comment, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
            });
            console.log('Очищенный комментарий', comment);
            var username = req.user.dataValues.username;
            var picId = req.body.picId;
            // Проверим размер комментария
            if (comment.length > 1000) {
                console.log('Слишком длинный комментарий');
                res.writeHead(200, {"Content-Type": "application/json"});
                var json = JSON.stringify({
                    status: 'denied',
                    msg: 'too long'
                });
                res.end(json);
            } else {
                client.query('INSERT INTO comments (comment, username, time, pic_id) VALUES ($1::text, $2::text, NOW(), $3::integer)',
                    [comment, username, picId], function(err, rows) {
                        if (err) {
                            console.log(err);
                        }
                        res.writeHead(200, {"Content-Type": "application/json"});
                        var json = JSON.stringify({
                            status: 'accepted',
                            comment: comment
                        });
                        res.end(json);
                        client.end();
                    })
            }
        });
    } else {
        res.writeHead(200, {"Content-Type": "application/json"});
        var json = JSON.stringify({
            error: 'not registered'
        });
        res.end(json);
        client.end();
    }
});

// Изменение комментария на сервере
router.use('/editcomment', function(req, res, next) {
    var Client = require('pg-native');
    var conString = process.env.DATABASE_URL;
    var client = new Client();
    if (req.user) {
        client.connect(conString, function(err) {
            if (err) {
                console.log(err);
            }
            console.log('Изменяют комментарий', req.body);
            //var comment = sanitizeHtml(req.body.comment);
            var comment = sanitizeHtml(req.body.comment, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
            });
            console.log('Очищенный комментарий', comment);
            var username = req.user.dataValues.username;
            var commentId = parseInt(req.body.commentId, 10);
            // Проверим размер комментария
            if (comment.length > 1000) {
                console.log('Слишком длинный комментарий');
                res.writeHead(200, {"Content-Type": "application/json"});
                var json = JSON.stringify({
                    status: 'denied',
                    msg: 'too long'
                });
                res.end(json);
            } else {
                // Проверяем, принадлежность комментария пользователю, который сделал запрос
                query('SELECT id, username FROM comments WHERE id=$1::integer and username=$2::text',
                    [commentId, username], function(err, rows) {
                        if (err) {
                            console.log(err);
                        }
                        if (rows.length === 0) {
                            res.writeHead(200, {"Content-Type": "application/json"});
                            var json = JSON.stringify({
                                status: 'denied',
                                error: 'access level'
                            });
                            res.end(json);
                        } else {
                            // Выберем текщий комментарий с таким commentId
                            // Скопируем его в таблицу с историей
                            // Изменим текущий комментарий
                            query('SELECT id, comment, time FROM comments WHERE id=$1::integer',
                                [commentId], function(err, rows) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    console.log(rows);
                                    var oldComment = rows[0];
                                    query('INSERT INTO comments_history (c_id, comment, time) VALUES ($1::integer, $2::text, $3)',
                                        [commentId, oldComment['comment'], oldComment['time']], function(err, rows) {
                                            if (err) {
                                                console.log(err);
                                            }
                                            console.log(rows);
                                            query('UPDATE comments SET comment=$1::text, time=NOW() WHERE id=$2::integer',
                                                [comment, commentId], function(err, rows) {
                                                    if (err) {
                                                        console.log('update');
                                                    }
                                                    res.writeHead(200, {"Content-Type": "application/json"});
                                                    var json = JSON.stringify({
                                                        status: 'accepted',
                                                        comment: {'commentId': commentId, 'comment': comment, 'username': username}
                                                    });
                                                    res.end(json);
                                                });
                                        });
                                });
                        }
                    });
            }
        });
    } else {
        res.writeHead(200, {"Content-Type": "application/json"});
        var json = JSON.stringify({
            error: 'not registered'
        });
        res.end(json);
        client.end();
    }
});

router.get('/dashboard', function(req, res) {
    if (!req.user) {
        req.app.locals.isRedirected = true;
        return res.redirect('/login');
    }
    return res.send('Comming soon');
    //var username = req.user.dataValues.username;
    //var commentsHistory = [];
    //query('SELECT id, username, comment FROM comments WHERE username=$1::text',
    //    [username], function(err, rows) {
    //        if (err) {
    //            console.log(err);
    //        }
    //        var currentCommentList = rows;
    //        console.log(currentCommentList);
    //        for (var i in currentCommentList) {
    //            query('SELECT comment, time FROM comments_history WHERE c_id=$1::integer',
    //                [currentCommentList[i]['id']], function(err, rows) {
    //                    if (err) {
    //                        console.log(err);
    //                    }
    //                    var historyCommentList = rows;
    //                    console.log(historyCommentList);
    //                    if
    //                });
    //        }
    //    });
    //function readyToAnswer() {
    //    var template = handlebars.compile(fs.readFileSync('./views/dashboard.html', 'utf8'));
    //    var output = template({
    //        title: 'История комментариев',
    //        user: req.user,
    //        //current: currentCommentList,
    //        //history: historyCo
    //    });
    //    return res.send(output);
    //}
});

router.get('/register', function(req, res) {
    if (req.user) {
        req.app.locals.isRedirected = true;
        return res.redirect('/dashboard');
    }
    if (!req.session.returnTo) {
        req.session.returnTo = req.get('Referer');
    }
    var template = handlebars.compile(fs.readFileSync('./views/register.html', 'utf8'));
    var output = template({
        title: 'Регистрация'
    });
    return res.send(output);
});

router.post('/register', function(req, res, next) {
    var username = sanitizeHtml(req.body.username);
    if (username === '') {
        var template = handlebars.compile(fs.readFileSync('./views/register.html', 'utf8'));
        var output = template({
            title: 'Регистрация',
            info: "Какой хитрец"
        });
        return res.send(output);
    }
    Account.register(username, req.body.password, function(err, account) {
        if (err) {
            console.log(err);
            var template = handlebars.compile(fs.readFileSync('./views/register.html', 'utf8'));
            var output = template({
                title: 'Регистрация',
                info: "Такое имя уже занято"
            });
            return res.send(output);
        }

        passport.authenticate('local')(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                var backURL = req.session.returnTo || '/';
                req.app.locals.isRedirected = true;
                return res.redirect(backURL);
            });
        });
    });
});

router.get('/login', function(req, res) {
    if (req.user) {
        req.app.locals.isRedirected = true;
        return res.redirect('/dashboard');
    }

    req.session.returnTo = req.get('Referer');

    var template = handlebars.compile(fs.readFileSync('./views/login.html', 'utf8'));
    var output = template({
        title: 'Вход',
        user : req.user
    });
    return res.send(output);
});

router.post('/login', function (req, res, next) {
    passport.authenticate('local', function(err, user, info){
        if (err) {
            return next(err);
        }
        if (!user) {
            var template = handlebars.compile(fs.readFileSync('./views/login.html', 'utf8'));
            var output = template({
                title: 'Вход',
                errorMessage: info.message
            });
            return res.send(output);
        }
        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }
            var backURL = req.session.returnTo || '/';
            req.app.locals.isRedirected = true;
            return res.redirect(backURL);
        });
    })(req, res, next);
});

router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        var backURL = req.header('Referer') || '/';
        req.app.locals.isRedirected = true;
        res.redirect(backURL);
    });
});

module.exports = router;

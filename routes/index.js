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
    res.send(output);
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
    res.send(output);
});

// Комментарии для картинок
router.get('/comments/:id', function(req, res, next) {
        var Client = require('pg-native');
        var conString = process.env.DATABASE_URL;
        var client = new Client();
        if (req.user) {
            console.log('id: ', req.params.id);
            client.connect(conString, function (err) {
                if (err) {
                    console.log(err);
                }
                client.query(
                    'SELECT comment, username, time FROM comments WHERE pic_id=$1::integer',
                    [req.params.id], function (err, rows) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(rows);
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
    res.send(output);
});

router.post('/register', function(req, res, next) {
    var username = sanitizeHtml(req.body.username);
    if (username === '') {
        var template = handlebars.compile(fs.readFileSync('./views/register.html', 'utf8'));
        var output = template({
            title: 'Регистрация',
            info: "Какой хитрец"
        });
        res.send(output);
        //return res.render("register", {info: "Какой хитрец"});
    }
    Account.register(username, req.body.password, function(err, account) {
        if (err) {
            console.log(err);
            var template = handlebars.compile(fs.readFileSync('./views/register.html', 'utf8'));
            var output = template({
                title: 'Регистрация',
                info: "Такое имя уже занято"
            });
            res.send(output);
        }

        passport.authenticate('local')(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                var backURL = req.session.returnTo || '/';
                req.app.locals.isRedirected = true;
                res.redirect(backURL);
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
    res.send(output);
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
            res.send(output);
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

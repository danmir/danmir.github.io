var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var User = require('./models/user');
var helmet = require('helmet');
var passportSocketIo = require('passport.socketio');
var pg = require('pg');
var session = require('express-session');
var pgSession = require('connect-pg-simple')(session);
var query = require('pg-query');
query.connectionParameters = process.env.DATABASE_URL;

var sessionStore = new pgSession({
    pg : pg,                                  // Use global pg-module
    conString : process.env.DATABASE_URL,     // Connect using something else than default DATABASE_URL env variable
    tableName : 'session'               // Use another table-name than the default "session" one
});

var routes = require('./routes/index');
var counter = require('./routes/counter');
var autoSpam = require('./routes/auto_spam');
var hitHandler = require('./routes/hit_handler');
var statisctic = require('./routes/statistic');
var yastatistic = require('./routes/yastatistic');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public/img/', 'favicon.JPG')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Fast page refresh
app.use(autoSpam);

// Hits handler
app.use(hitHandler);

// Statistic
app.use(statisctic);

// Implement X-XSS-Protection
app.use(helmet.xssFilter());

// Passport js
app.use(session({
    store: sessionStore,
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use('/', routes);
app.use('/counter', counter);
app.use('/yastatistic', yastatistic);

// Socket.io
io.use(passportSocketIo.authorize({
    store: sessionStore,
    cookieParser: cookieParser,
    key: 'connect.sid',
    secret: 'keyboard cat',
    fail: onAuthorizeFail
}));

function onAuthorizeFail(data, message, error, accept) {
    if (error) {
        console.log('socket.io failed', message);
    }
    accept();
}

io.on('connection', function (socket) {
    if (socket.request.user.logged_in) {
        console.log('send event: logged in');
        socket.emit('logged in');

        socket.on('logged in', function(data) {
            if (socket.request.user) {
                socket.emit('logged in');
            }
        });
        // Ждем текущей картинки, проверяем лайкал ли ее пользователь, отправляем ответ
        socket.on('current pic', function(data) {
            var userId = parseInt(socket.request.user.dataValues.id, 10);
            var picNum = parseInt(data.pic, 10);
            query('SELECT * FROM likes WHERE user_id=$1::integer and pic_num=$2::integer', [userId, picNum],
                function(err, rows, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
                    console.log(rows);
                    if (rows.length) {
                        // Делаем кнопку активной
                        socket.emit('liked');
                    }
                }
            );
            query('SELECT count(*) FROM likes WHERE pic_num=$1::integer', [picNum],
                function(err, rows, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
                    // Отправляем количество лайков
                    socket.emit('likes num', {count: rows[0].count, pic: picNum});
                }
            );
        });
        // Ждем, когда лайкнут
        socket.on('like added', function (data) {
            if (socket.request.user) {
                var userId = parseInt(socket.request.user.dataValues.id, 10);
                var picNum = parseInt(data.pic, 10);
                //console.log(userId, picNum);
                // Проверяем, лайкал ли пользователь данную картинку
                query('SELECT * FROM likes WHERE user_id=$1::integer and pic_num=$2::integer', [userId, picNum],
                    function(err, rows, result) {
                        if(err) {
                            return console.error('error running query', err);
                        }
                        //console.log(result);
                        if (!rows.length) {
                            query('INSERT INTO likes (pic_num, user_id) VALUES ($1::integer, $2::integer)', [picNum, userId], function(err, rows, result) {
                                if(err) {
                                    return console.error('error running query', err);
                                }
                                socket.emit('like added', {status: '+1'});
                                // Оповещаем всех остальных, причем синхронно, после обновления количества лайков
                                query('SELECT count(*) FROM likes WHERE pic_num=$1::integer', [picNum],
                                    function(err, rows, result) {
                                        if (err) {
                                            return console.error('error running query', err);
                                        }
                                        // Отправляем количество лайков
                                        console.log('Отправляем всем новое количество');
                                        socket.broadcast.emit('likes num', {count: rows[0].count, pic: picNum});
                                    }
                                );
                            });
                        } else {
                            query('DELETE FROM likes WHERE user_id=$1::integer and pic_num=$2::integer', [userId, picNum], function(err, rows, result) {
                                if(err) {
                                    return console.error('error running query', err);
                                }
                                socket.emit('like added', {status: '-1'});
                                // Оповещаем всех остальных, причем синхронно, после обновления количества лайков
                                query('SELECT count(*) FROM likes WHERE pic_num=$1::integer', [picNum],
                                    function(err, rows, result) {
                                        if (err) {
                                            return console.error('error running query', err);
                                        }
                                        // Отправляем количество лайков
                                        console.log('Отправляем всем новое количество');
                                        socket.broadcast.emit('likes num', {count: rows[0].count, pic: picNum});
                                    }
                                );
                            });
                        }
                    }
                );
                //console.log('Добавляем лайк');
            }
        });
    } else {
        socket.on('current pic', function(data) {
            var picNum = parseInt(data.pic, 10);
            query('SELECT count(*) FROM likes WHERE pic_num=$1::integer', [picNum],
                function(err, rows, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }
                    // Отправляем количество лайков
                    socket.emit('likes num', {count: rows[0].count, pic: picNum});
                }
            );
        });
    }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.set('port', (process.env.PORT || 5000));
server.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
//app.listen(app.get('port'), function() {
//  console.log('Node app is running on port', app.get('port'));
//});

module.exports = app;

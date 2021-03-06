//document.addEventListener('DOMContentLoaded', domReady, false);

// Мониторим, открыта ли большая картинка сейчас
var isBigPicOpened = false;
var isHelpOpened = false;
var currentModuleScreen = null;
// Список всех картинок
var pictures = window.pictures;
// Socket.io
var socket;
window.editInProcess = 0;

function domReady() {
    console.log("Dom ready");

    // Для справки в IE
    if ("onhelp" in window) {
        window.onhelp = function () {
            genInfo();
            return false;
        }
    }

    // Подключаемся к серверу
    socket = io.connect(window.location.host);
    console.log('Connect socket');

    window.addEventListener('keyup', kp);
    window.addEventListener('hashchange', hashChanged);
    window.addEventListener("resize", onResize);

    // Проверим, есть ли картинка в куках
    var picNum = getCookie('picNum');
    if (picNum) {
        if (pictures[picNum]) {
            window.location.hash = (picNum).toString();
            hashChanged();
        }
    }

    // Проверим, есть ли любимый котик
    var topImg = getCookie('topImg');
    if (topImg) {
        if (pictures[topImg]) {
            setFavImage(pictures[topImg]);
        }
    }
}

// elem - объект со свойствами
// previewPic
// fullPic
function setBackground(elem) {
}

function hashChanged() {
    console.log('Hash changed');
    var hash = window.location.hash.substring(1);
    console.log(hash);
    if (isBigPicOpened) {
        exitModuleScreen();
    }
    if (pictures[hash]) {
        genFullPic(pictures[hash]);
    }
}

// Генерируем кнопку с likes
function genLikesArea(parent, num) {
    var likes = '<div class="ui left labeled button" tabindex="0">';
    likes += '<a class="ui basic right pointing label" id="likes-num">';
    likes += num;
    likes += '</a>';
    likes += '<div class="ui button disabled" id="like-button" onclick="addLike()">';
    likes += '<i class="heart icon"></i> Like';
    likes += '</div></div>';
    parent.innerHTML = likes;
}

// Генерируем поле ввода
// parent - узел, к которому прицепить
function genCommentArea(parent) {
    var form = '<div class="ui form">';
    form += '<div class="field"><textarea rows="2" id="comment_field" placeholder="Комментарий"></textarea></div>';
    form += '<button type="submit" onclick="sendCommentHandler()" class="ui button">Отправить</button>';
    form += '</div>';
    parent.innerHTML = form;
}

// Предложение сделать картинку сверху
// Возвращает node с предложением
// callback - что сделать по нажатию
function genFavSuggestion(callback) {
    var backSuggestion = document.createElement('div');
    backSuggestion.setAttribute('class', 'ui blue message');
    backSuggestion.setAttribute('onclick', callback);
    backSuggestion.setAttribute('style', 'cursor: pointer;');
    backSuggestion.innerHTML = 'Сделать котика сверху';
    return backSuggestion;
}

// Устанавливаем картинку сверху
// elem - объект со свойствами
// previewPic
// fullPic
function setFavImage(elem) {
    var img = document.getElementById('fav-cat-img');
    img.setAttribute('src', elem['fullPic']);
    var topImg = document.getElementById('fav-cat');
    topImg.setAttribute('style', 'display: block;');
}

function unsetFavImage() {
    deleteCookie('topImg');
    var topImg = document.getElementById('fav-cat');
    topImg.setAttribute('style', 'display: none;');
}

// Обработчик нажатия на кнопку установки картинки сверху
function setFavImageHandler() {
    var hash = parseInt(window.location.hash.substring(1), 10);
    setFavImage(pictures[hash]);
    setCookie('topImg', hash, {'expires': 99999});
}

// elem - объект со свойствами
// previewPic
// fullPic
function genFullPic(elem) {
    var previewPic = elem['previewPic'];
    var fullPic = elem['fullPic'];
    console.log(elem);

    var popupScreen = document.createElement('div');
    popupScreen.setAttribute('class', 'ui modal visible active my-scrolling');
    popupScreen.setAttribute('id', 'popup-screen');
    popupScreen.setAttribute('style', 'top: 20px; text-align: center;');
    var popupHeader = document.createElement('div');
    popupHeader.setAttribute('class', 'header');
    var popupImg = document.createElement('div');
    popupImg.setAttribute('class', 'content');
    popupImg.setAttribute('id', 'popup-image');
    var likes = document.createElement('div');
    var bigPic = document.createElement('img');
    bigPic.setAttribute('onclick', 'clearBigPic()');
    bigPic.setAttribute('alt', 'bigpic');
    bigPic.setAttribute('src', 'img/placeholder.png');
    bigPic.setAttribute('class', 'ui image');
    bigPic.setAttribute('style', 'display: inline-block;');
    var popupComments = document.createElement('div');
    popupComments.setAttribute('class', 'content');
    popupComments.setAttribute('id', 'popup-comments');
    popupImg.appendChild(bigPic);
    popupScreen.appendChild(popupHeader);
    popupScreen.appendChild(popupImg);
    popupScreen.appendChild(genFavSuggestion('setFavImageHandler()'));
    popupScreen.appendChild(likes);
    popupScreen.appendChild(popupComments);

    // Отправим номер текущей картинки на сервер
    var hash = parseInt(window.location.hash.substring(1), 10);
    socket.emit('current pic', {pic: hash});
    // Likes
    genLikesArea(likes, 0);
    // Как только сервер разрешит (пользователь зарегистрируется) - сделаем кнопку лайков активной
    // Спросим сервер, авторизированы ли клиент
    socket.emit('logged in');
    socket.on('logged in', function(data) {
        console.log('event: logged in');
        var is_active = document.getElementById("like-button").getAttribute('class').indexOf('active');
        if (is_active === -1) {
            document.getElementById("like-button").setAttribute('class', 'ui button');
        }
    });
    // Получаем статус кнопки с лайком
    socket.on('liked', function(data) {
        console.log('event: liked');
        document.getElementById("like-button").setAttribute('class', 'ui button active');
    });
    // Следим за количеством лайков
    socket.on('likes num', function(data) {
        console.log('event: likes num', data);
        // Проверим, что пришел ответ для нашей картинки
        if (data.pic === hash) {
            document.getElementById("likes-num").innerHTML = data.count;
        }
    });

    // Форма для комментариев
    genCommentArea(popupComments);
    // Запрос на комментарии
    var comments = getCommentsForPic(hash);
    // Отображение комментариев
    showComments(popupComments, comments);

    var downloadingImage = new Image();
    downloadingImage.onload = function() {
        // Иначе слишком быстро загружается
        var that = this;
        setTimeout(function () {bigPic.src = that.src;}, 1);
    };
    downloadingImage.src = fullPic;

    // Предзагрузка соседних картинок
    if (pictures[hash - 1]) {
        var prevImg = new Image();
        prevImg.src = pictures[hash - 1].fullPic;
    }
    if (pictures[hash + 1]) {
        var nextImg = new Image();
        nextImg.src = pictures[hash + 1].fullPic;
    }

    // Добавляем большую картинку на ширму
    document.getElementById("main").appendChild(popupScreen);
    // Добавляем саму ширму
    document.getElementById("blanket").style.display = "table";
    // Ставим флаг
    isBigPicOpened = true;
    // Запоминаем, что открыто
    setCookie('previewPic', previewPic, {'expires': 99999});
    setCookie('fullPic', fullPic, {'expires': 99999});
    setCookie('picNum', hash, {'expires': 99999});
}

// Добавление лайка
function addLike() {
    var hash = window.location.hash.substring(1);
    // Сообщим серверу
    socket.emit('like added', {pic: hash});
    // Подождем ответа
    var likesNum = parseInt(document.getElementById("likes-num").innerHTML, 10);
    socket.on('like added', function(data) {
        if (data.status === '+1') {
            likesNum += 1;
            document.getElementById("like-button").setAttribute('class', 'ui button active');
            document.getElementById("likes-num").innerHTML = likesNum.toString();
        } else if (data.status === '-1') {
            likesNum -= 1;
            document.getElementById("like-button").setAttribute('class', 'ui button');
            document.getElementById("likes-num").innerHTML = likesNum.toString();
        }
    });
}

// Зпрашиваем комментарии у сервера
// по id картинки
// Возвращаем 'error' или
// {id, comment, time, username, mine}
function getCommentsForPic(picNum) {
    var xhr = new XMLHttpRequest();
    var json = JSON.stringify({
        picNum: picNum
    });
    xhr.open('GET', '/comments/' + picNum, false);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(json);
    if (xhr.status != 200) {
        console.log(xhr.status);
        return 'error';
    }
    var parsedComments = JSON.parse(xhr.responseText);
    console.log(parsedComments);
    return parsedComments;
}

// Отправляем комментарий на сервер для заданной картинки
function sendCommentForPic(picNum, comment) {
    var xhr = new XMLHttpRequest();
    var json = JSON.stringify({
        picId: picNum,
        comment: comment
    });
    xhr.open('POST', '/comments', false);
    //xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(json);
    var jsonResponse = JSON.parse(xhr.responseText);
    console.log(jsonResponse);
    if (jsonResponse['status'] && jsonResponse['status'] === 'accepted') {
        comment = jsonResponse['comment'];
        var popupList = document.querySelector('#popup-comments');
        addCommentToPage(popupList, comment);
    } else {
        if (jsonResponse['status'] && jsonResponse['status'] === 'denied') {
            if (jsonResponse['msg'] === 'too long') {
                alert("Слишком длинное сообщение");
            }
        }
    }
}

function sendCommentHandler() {
    console.log('Send button clicked');
    var hash = parseInt(window.location.hash.substring(1), 10);
    var comment = document.getElementById('comment_field').value;
    sendCommentForPic(hash, comment);
    document.getElementById('comment_field').value = '';
}

// comment - {id, time, username, comment, mine}
function createComment(comment) {
    var commentDiv = document.createElement('div');
    commentDiv.setAttribute('class', 'comment-msg');
    commentDiv.setAttribute('data-commentId', comment['id']);
    commentDiv.innerHTML += comment.username;
    commentDiv.innerHTML += " @ (" + comment.time + ") ";
    commentDiv.innerHTML += comment['comment'];
    if (comment['mine'] === '1') {
        commentDiv.setAttribute('data-mine', '1');
        commentDiv.setAttribute('onclick', 'editCommentHandler(event)');
        commentDiv.innerHTML = '[Редактировать]  ' + commentDiv.innerHTML;
    } else {
        commentDiv.setAttribute('data-mine', '0');
    }
    return commentDiv;
}

// Добавляем комментарий к странице без перезагрузки
function addCommentToPage(node, comment) {
    node.appendChild(createComment({comment: comment, time: new Date(), username: 'Я'}));
}

// Отображаем полученные комментарии
// node - узел, куда добавлять
// comments - [] с {id, comment, time, username}
function showComments(node, comments) {
    if (comments['error'] === 'not registered') {
        var bigStr = '<div class="ui warning message"><a href="/login">Для лайков и комментариев авторизируйтесь</a></div>';
        node.innerHTML = bigStr;
        return;
    }
    comments = comments.comments;

    for (var i = 0; i < comments.length; ++i) {
        var comment = comments[i];
        node.appendChild(createComment(comment));
    }
}

// commentId, comment - string
function editComment(commentId, comment) {
    var xhr = new XMLHttpRequest();
    var json = JSON.stringify({
        commentId: commentId,
        comment: comment
    });
    xhr.open('POST', '/editcomment/', false);
    //xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(json);
    var jsonResponse = JSON.parse(xhr.responseText);
    console.log(jsonResponse);
    return jsonResponse;
}

function editCommentHandler(event) {
    if (window.editInProcess === 0) {
        window.editInProcess = 1;
        var commentDiv = event.target;
        var commentId = commentDiv.dataset['commentid'];
        var editDiv = document.createElement('div');
        editDiv.setAttribute('class', 'comment-msg');
        editDiv.setAttribute('id', 'curr-edit');
        var editFieldDiv = document.createElement('div');
        editFieldDiv.setAttribute('class', 'ui fluid action input');
        editFieldDiv.innerHTML = '<input type="text" placeholder="Новый коммент" id="new-comment" data-commentid="' + commentDiv.getAttribute('data-commentid') + '">';
        editFieldDiv.innerHTML += '<div class="ui button" onclick="updateHandler()" data-commentid="' + commentDiv.getAttribute('data-commentid') + '">Обновить</div>';
        editDiv.appendChild(editFieldDiv);

        commentDiv.removeAttribute('class');
        //commentDiv.removeAttribute('data-commentid');
        commentDiv.removeAttribute('onclick');
        commentDiv.innerHTML = '';

        commentDiv.setAttribute('class', editDiv.getAttribute('class'));
        commentDiv.setAttribute('id', editDiv.getAttribute('id'));
        commentDiv.innerHTML = editDiv.innerHTML;
    }
}

function updateHandler() {
    var newCommentText = document.getElementById('new-comment').value;
    var commentId = document.getElementById('new-comment').dataset['commentid'];
    var result = editComment(commentId, newCommentText);
    if (result['status'] && result['status'] === 'accepted') {
        var editDiv = document.getElementById('curr-edit');
        editDiv.innerHTML = '';
        editDiv.setAttribute('class', 'comment-msg');
        editDiv.setAttribute('data-commentId', result['comment']['commentId']);
        editDiv.setAttribute('onclick', 'editCommentHandler(event)');
        editDiv.innerHTML += result['comment']['username'];
        editDiv.innerHTML += " @ (" + new Date() + ") ";
        editDiv.innerHTML += result['comment']['comment'];
        window.editInProcess = 0;
    } else {
        var editDiv = document.getElementById('curr-edit');
        editDiv.innerHTML = 'Что-то пошло не так. Перезагружайте стрицу и пробуйте еще. Спасибо. <br> Возможно нету достаточно прав';
    }
}

function genInfo() {
    // Добавляем ширму
    document.getElementById("blanket").style.display = "block";
    // Добавляем помощь
    document.getElementById("info").style.display = "block";
    // Ставим флаг
    isHelpOpened = true;
}

function showNext() {
    if (isBigPicOpened) {
        var hash = parseInt(window.location.hash.substring(1), 10);
        console.log(hash);
        if (pictures[hash + 1]) {
            window.location.hash = (hash + 1).toString();
        }
    }
}

function showPrev() {
    if (isBigPicOpened) {
        var hash = parseInt(window.location.hash.substring(1), 10);
        console.log(hash);
        if (pictures[hash - 1]) {
            window.location.hash = (hash - 1).toString();
        }
    }
}

function clearBigPic(e) {
    console.log('clearBigPic');
    exitBigPic();
    // Чистим hash
    window.location.hash = '';
}

function exitBigPic(e) {
    // Удаляем картинку
    // Скрываем ширму
    var popupScreen = document.getElementById('popup-screen');
    document.getElementById("blanket").style.display = "none";
    document.getElementById("main").removeChild(popupScreen);
    // Устанавливаем флаг
    isBigPicOpened = false;
    // Чистим cookie
    if (getCookie('fullPic')) {
        deleteCookie('fullPic');
    }
    if (getCookie('previewPic')) {
        deleteCookie('previewPic');
    }
    if (getCookie('picNum')) {
        deleteCookie('picNum');
    }
}

function exitHelp() {
    document.getElementById("blanket").style.display = "none";
    document.getElementById("info").style.display = "none";
    isHelpOpened = false;
}

function exitModuleScreen() {
    if (isHelpOpened) {
        exitHelp();
    }
    if (isBigPicOpened) {
        exitBigPic();
    }
}

// Обрабатываем нажатие на кнопки
function kp (e) {
    console.log(e);
    var code = e.keyCode || e.which;
    if (code === 27) {
        console.log("escape key-up pressed");
        window.location.hash = '';
        exitModuleScreen();
    }
    if (code === 112) {
        console.log("f1 key-up pressed");
        genInfo();
    }
    if (code === 37) {
        console.log('Left arrow pressed');
        showPrev();
    }
    if (code === 39) {
        console.log('Right arrow pressed');
        showNext();
    }
}
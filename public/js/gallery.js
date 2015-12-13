//document.addEventListener('DOMContentLoaded', domReady, false);

// Мониторим, открыта ли большая картинка сейчас
var isBigPicOpened = false;
var isHelpOpened = false;
var currentModuleScreen = null;
// Список всех картинок
var pictures = window.pictures;

function domReady() {
    console.log("Dom ready");
    //setVH(30, "Top", "gallery-main");
    //setVH(20, "Bottom", "gallery-main");

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

// Генерируем поле ввода
// parent - узел, к которому прицепить
function genCommentArea(parent) {
    var form = '<div class="pure-g comment-input">';
    form += '<textarea class="pure-u-2-3" id="comment_field" placeholder="Комментарий"></textarea>';
    form += '<button type="submit" onclick="sendCommentHandler()" class="pure-button pure-u-1-3 pure-button-primary">Отправить</button>';
    form += '</div>';
    parent.innerHTML = form;
}

// elem - объект со свойствами
// previewPic
// fullPic
function genFullPic(elem) {
    var previewPic = elem['previewPic'];
    var fullPic = elem['fullPic'];
    console.log(elem);
    var popupScreen = document.createElement('div');
    popupScreen.setAttribute('class', 'popup-screen');
    popupScreen.setAttribute('id', 'popup-screen');
    var popupImg = document.createElement('div');
    popupImg.setAttribute('class', 'popup-image');
    popupImg.setAttribute('id', 'popup-image');
    var popupComments = document.createElement('div');
    popupComments.setAttribute('class', 'popup-comments');
    popupComments.setAttribute('id', 'popup-comments');
    var bigPic = document.createElement('img');
    bigPic.setAttribute('onclick', 'clearBigPic()');
    bigPic.setAttribute('class', 'my-pure-img');
    bigPic.setAttribute('alt', 'bigpic');
    bigPic.setAttribute('src', 'img/placeholder.png');
    popupImg.appendChild(bigPic);
    popupScreen.appendChild(popupImg);
    popupScreen.appendChild(popupComments);

    // Форма для комментариев
    genCommentArea(popupComments);
    // Запрос на комментарии
    var hash = parseInt(window.location.hash.substring(1), 10);
    var comments = getCommentsForPic(hash);
    // Отображение комментариев
    showComments(popupComments, comments);

    var downloadingImage = new Image();
    downloadingImage.onload = function() {
        // Иначе слишком быстро загружается
        var that = this;
        setTimeout(function () {bigPic.src = that.src;}, 1000);
    };
    downloadingImage.src = fullPic;
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

// Зпрашиваем комментарии у сервера
// по id картинки
// Возвращаем 'error' или
// {id, comment, time, username}
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
    }
}

function sendCommentHandler() {
    console.log('Send button clicked');
    var hash = parseInt(window.location.hash.substring(1), 10);
    var comment = document.getElementById('comment_field').value;
    var popupList = document.querySelector('#popup-comments');
    sendCommentForPic(hash, comment);
    document.getElementById('comment_field').value = '';
}

// comment - {time, username, comment}
function createComment(comment) {
    var commentDiv = document.createElement('div');
    commentDiv.setAttribute('class', 'comment-msg');
    commentDiv.innerHTML += comment.username;
    commentDiv.innerHTML += " @ (" + comment.time + ") ";
    commentDiv.innerHTML += comment['comment'];
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
        var bigStr = '<a href="/login">Авторизируйтесь для дальнейших действий</a>';
        node.innerHTML = bigStr;
        return;
    }
    comments = comments.comments;

    for (var i = 0; i < comments.length; ++i) {
        var comment = comments[i];
        node.appendChild(createComment(comment));
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
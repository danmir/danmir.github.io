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
    if (getCookie('previewPic') && getCookie('fullPic')) {
        genFullPic({
            previewPic: getCookie('previewPic'),
            fullPic: getCookie('fullPic')
        });
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

    //var bigPicWrapper = document.createElement('div');
    //bigPicWrapper.setAttribute('class', 'big-pic');
    //bigPicWrapper.setAttribute('id', 'big-pic');
    //var bigPic = document.createElement('img');
    //bigPic.setAttribute('onclick', 'clearBigPic()');
    //bigPic.setAttribute('alt', 'bigpic');
    //bigPic.setAttribute('src', 'img/placeholder.png');
    //bigPicWrapper.appendChild(bigPic);
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
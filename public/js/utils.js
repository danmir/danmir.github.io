//TODO Объединить следующие 2 функции
function setVH(vh, direction, elemID) {
    // В IE8 нет vh и vw
    // Эмуляция единиц vh
    // direction = Top || Bottom
    var h = window.innerHeight;
    var elem = document.getElementById(elemID);
    // Говорят и такое в IE не работать может
    elem.style["margin" + direction] =  [(h / 100 * vh).toString(), "px"].join("");
}

function setVW(vw, direction, elemID) {
    // В IE8 нет vh и vw
    // Эмуляция единиц vh
    // direction = Top || Bottom
    var w = window.innerWidth;
    var elem = document.getElementById(elemID);
    // Говорят и такое в IE не работать может
    elem.style["margin" + direction] =  [(w / 100 * vw).toString(), "px"].join("");
}

function onResize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    console.log(w, h);
    //setVH(30, "Top", "gallery-main");
    //setVH(20, "Bottom", "gallery-main");
}

function getStyles(elem) {
    // Для IE и для других
    return elem.currentStyle || window.getComputedStyle(elem);
}
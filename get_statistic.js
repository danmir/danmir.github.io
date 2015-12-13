// Рисуем картинку со статистикой
var gm = require('gm');
function getStatisticPic(todayVisits, AllVisits, todayHits, AllHits) {
    gm(250, 100, "#ddff99f3")
        .font('Arial')
        .fontSize(17)
        .drawText(10, 20, "Визитов сегодня")
        .drawText(210, 20, todayVisits)
        .drawText(10, 40, "Визитов в общем")
        .drawText(210, 40, AllVisits)
        .drawText(10, 60, "Просмотров за сегодня")
        .drawText(210, 60, todayHits)
        .drawText(10, 80, "Просмотров в общем")
        .drawText(210, 80, AllHits)
        .write("public/img/statistic.jpg", function (err) {
            console.log(err);
        });
}

module.exports = getStatisticPic;
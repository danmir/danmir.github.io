var express = require('express');
var app = require('../app.js');
var request = require('request');
var fs = require("fs");
var handlebars = require('handlebars');
var layouts = require('handlebars-layouts');
var router = express.Router();

function parseYandexAns(ans) {
    var dimensions = [];
    for (key in ans['query']['dimensions']) {
        dimensions.append();
    }
}

router.get('/', function(req, res, next) {
    var ans;
    request('https://api-metrika.yandex.ru/stat/v1/data?ids=34965660&metrics=ym:s:visits,ym:s:pageDepth,ym:s:avgVisitDurationSeconds&dimensions=ym:s:ageInterval&oauth_token=d6916eb6de304b8191c919cf82304af2', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            ans = JSON.parse(body);
            //console.log(ans);
            //console.log(ans['query']['dimensions']);
            //console.log(ans['query']['metrics']);
            //console.log(ans['data']);
            var context = {};
            context['age'] = [];
            //context['age'].append({'met': dd});
            for (var d in ans['data']) {
                var dd = ans['data'][d]['dimensions'][0]['name'];
                //console.log(dd);
                context['age'].push({'age': dd, 'metrics': []});
            }
            //console.log(context);
            for (var i in context['age']) {
                for (var m in ans['query']['metrics']) {
                    var mm = ans['query']['metrics'][m];
                    console.log(mm);
                    context['age'][i]['metrics'].push({'name': mm.replace('ym:s:',''), 'value': ans['data'][i]['metrics'][m]});
                }
            }
            request('https://api-metrika.yandex.ru/stat/v1/data?ids=34965660&metrics=ym:s:visits,ym:s:pageviews&dimensions=ym:s:windowClientWidth,ym:s:windowClientHeight&oauth_token=d6916eb6de304b8191c919cf82304af2', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    ans = JSON.parse(body);
                    context['resolution'] = [];
                    for (var d in ans['data']) {
                        var ddw = ans['data'][d]['dimensions'][0]['name'];
                        var ddh = ans['data'][d]['dimensions'][1]['name'];
                        context['resolution'].push({'width': ddw, 'height': ddh, 'metrics': []});
                    }
                    for (var i in context['resolution']) {
                        for (var m in ans['query']['metrics']) {
                            var mm = ans['query']['metrics'][m];
                            context['resolution'][i]['metrics'].push({'name': mm.replace('ym:s:',''), 'value': ans['data'][i]['metrics'][m]});
                        }
                    }
                    request('https://api-metrika.yandex.ru/stat/v1/data?ids=34965660&metrics=ym:s:visits,ym:s:pageviews&dimensions=ym:s:startURLPathFull&oauth_token=d6916eb6de304b8191c919cf82304af2', function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            ans = JSON.parse(body);
                            console.log(ans);
                            context['path'] = [];
                            for (var d in ans['data']) {
                                var path = ans['data'][d]['dimensions'][0]['name'];
                                context['path'].push({'path': path, 'metrics': []});
                            }
                            for (var i in context['path']) {
                                for (var m in ans['query']['metrics']) {
                                    var mm = ans['query']['metrics'][m];
                                    context['path'][i]['metrics'].push({'name': mm.replace('ym:s:',''), 'value': ans['data'][i]['metrics'][m]});
                                }
                            }
                            var template = handlebars.compile(fs.readFileSync('./views/statistic.html', 'utf8'));
                            var output = template(context);
                            return res.send(output);
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;
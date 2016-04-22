/**
 * @author HuuNV
 * @mail bonphuonglanha@gmail.com
 */
var http = require('http'),
        filesystem = require("fs"),
        cheerio = require("cheerio"),
        url = require("url"),
        crypto = require('crypto');
var now = new Date();
var prefix = now.getDate() + "-" + (now.getMonth() + 1) + "-" + now.getFullYear();
var logfile = prefix + "-download.log";
var Log = require('log'),
        log = new Log('debug', filesystem.createWriteStream('logs/' + logfile));

var CONFIG = {
    "Server": {
        "serverPort": 8889,
        "serverHost": "127.0.0.1"
    },
    "Module": {
        "expTime": 360000000,
        "downloadDir": "./html/"
    },
    "SiteConfig": ["taobao", "tmall", "1688", "amazon"],
    "docs": {
        "inputParam": "/?urlDetail"
    }
};

var configSite = CONFIG.SiteConfig;

var dir = CONFIG.Module.downloadDir;

var mydownloader = {
    xdownload: function (myUrl, cate, res) {
        var request = require('request');
        var options = {
            'uri': myUrl.replace('+',' '),
            'method' : "GET",
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36',
            'timeout' : 20000,
            'followRedirect' : true,
            'maxRedirects' : 10
        };
        //console.log('Url Call: '+options.uri);
        var _callback = function (error, response, body) {

            log.info("Start download ");
            try {
                if (!error && response.statusCode === 200) {
                    var product = {};var node = {};var url = {};var css = [];
                    var $ = cheerio.load(body);
                    var title = $('title').html();
                    if(title==='500 Service Unavailable Error'){
                        log.error("500 Service Unavailable Error " + error + " statusCode: " + response.statusCode);
                        res.end(JSON.stringify({"code": 102, "message": "500 Service Unavailable Error"}));
                        return false;
                    }
                    if (cate === 'asin') {
                        $('link[rel="stylesheet"]').each(function (i, ele) {
                            css.push($(this).attr('href'));
                        });
                        product.productNav = $('.nav-subnav > #nav-subnav').html();
                        $('#navFooter').remove();
                        $('#rightCol').remove();
                        if ($('#imgTagWrapperId > img').length > 0) {
                            var img = $('#imgTagWrapperId > img').attr('src');
                            $('#imgTagWrapperId').html('<img src="' + img + '"/>');
                        }
                        ;
                        $('#giveaway').remove();
                        $('#sims-fbt').remove();
                        $('#navbar').remove();
                        $('.site-stripe-margin-control').remove();
                        $('#buybox_feature_div').remove();
                        product.content = $('#a-page').html();
                        product.css = css;
                        res.end(JSON.stringify(product));
                        return;
                    } else if (cate === 'node') {
                        node.navSubnav = $('.nav-subnav > #nav-subnav').html();
                        $('link[rel="stylesheet"]').each(function (i, ele) {
                            css.push($(this).attr('href'));
                        });
                        node.css = css;
                        if ($("#nav-subnav > .nav-a").length > 0) {
                            $('#buyxgety_feature_div').remove();
                            node.content = $('.a-fixed-left-flipped-grid').html();
                            if (node.content === null) {
                                node.content = $('#content').html();
                            }
                            if (node.content === null) {
                                $('#footer').remove();
                                $('#navbar').remove();
                                node.content = $('#a-page').html();
                            }
                        } else {
                            node.content = $('#container').html();
                        }
                        res.end(JSON.stringify(node));
                        return;
                    } else if (cate === 'url') {
                        $('link[rel="stylesheet"]').each(function (i, ele) {
                            css.push($(this).attr('href'));
                        });
                        $('#footer').remove();
                        $('#navbar').remove();
                        url.urlNav = $('.nav-subnav > #nav-subnav').html();
                        url.content = $('#a-page').html();
                        if (url.content === null) {
                            url.content = $('#zg').html();
                        }
                        url.css = css;
                        url.helper = $('.cs-help-content').html();
                        res.end(JSON.stringify(url));
                        return;
                    }
                } else {
                    log.error("Download failed " + error + " statusCode: " + response.statusCode);
                    res.end(JSON.stringify({"code": 2, "message": "download failed"}));
                }
            } catch (e) {
                console.log(e);
            }
        };
        request(options.uri, _callback).setMaxListeners(200);
    }
};
var app = {
    doGet: function (request, response) {
        try {
            var parsedUrl = url.parse(request.url, true);
            //console.log('URL GOC: ' + parsedUrl.href);
            var queryAsObject = parsedUrl.query;
            if (queryAsObject.hasOwnProperty('urlDetail') && queryAsObject.urlDetail !== '') {
                var cate = null;
                var urlDetail;
                if (queryAsObject.hasOwnProperty('asin') && queryAsObject.asin !== '') {
                    cate = 'asin';
                    urlDetail = parsedUrl.href.slice(12).replace('&asin=/','');
                }
                //http://www.amazon.com/gp/goldbox/ref=nav_cs_gb
                if (queryAsObject.hasOwnProperty('homepage') && queryAsObject.homepage !== '') {
                    var webdriver = require('selenium-webdriver');
                    var d = {};
                    var driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();
                    driver.manage().timeouts().setScriptTimeout(20);
                    driver.get('http://www.amazon.com/gp/goldbox/ref=nav_cs_gb');
                    driver.findElement(webdriver.By.id('widgetContent')).then(function (webElement) {
                        webElement.getInnerHtml().then(function (html) {
                            d.content = html;
                            response.writeHead(200, {'Content-Type': 'text/json; charset=utf-8'});
                            response.end(JSON.stringify(d));
                        });
                    }, function (err) {
                        if (err.state && err.state === 'no such element') {
                            console.log('Element not found');
                        } else {
                            webdriver.promise.rejected(err);
                        }
                    });
                    driver.quit();
                    return;
                }
                if (queryAsObject.hasOwnProperty('url') && queryAsObject.url !== '') {
                    cate = 'url';
                    urlDetail = parsedUrl.href.slice(12).replace('&url=/','');
                    //console.log('URL: '+ urlDetail);
                }
                // tach site name tu url
                if (typeof urlDetail !== 'undefined') {
                    try {
                        var hostName = url.parse(urlDetail).host.split(".");
                    } catch (e) {
                        console.log('e');
                    }
                }
                // truyen vao site name neu khong boc duoc site name tu url
                if (typeof hostName === 'undefined') {
                    var hostName = [];
                    hostName[1] = 'amazon';
                }
                if (queryAsObject.hasOwnProperty('expTime')) {
                    // lay thoi gian het han duoc truyen vao
                    expireTime = parseInt(queryAsObject.expTime);
                }
                mydownloader.xdownload(urlDetail, cate, response);
            } else {
                response.end(JSON.stringify({"code": 2, "message": "no url detail"}));
            }
        } catch (e) {
            console.log(e);
        }

    },
};

//var serverPort = 8889;

var server = http.createServer(function (req, res) {
    app.doGet(req, res);
});
server.listen(CONFIG.Server.serverPort, CONFIG.Server.serverHost);

console.log("+----------------------------------------------+");
console.log("+--------------Nodejs web server---------------+");
console.log("+--------------Parse html content--------------+");
console.log("|                                              |");
console.log("|*Config site: " + configSite + "        |");
console.log("|*Http server listening " + CONFIG.Server.serverPort + "                   |");
console.log("|*Input param: " + CONFIG.docs.inputParam + "                     |")
console.log("|                                              |");
console.log("+----------------------------------------------+");


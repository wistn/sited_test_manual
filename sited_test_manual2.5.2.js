/*
 * Author:wistn
 * since:2019-04-12
 * LastEditors:Do not edit
 * LastEditTime:2019-10-25
 * Description:Inspired by MrChen(magicdmer),SiteD Engine/APP is Created by noear.
 * v2.5.2。本脚本方便多多猫SiteD插件者用电脑测试插件，目前支持schema=1/0多层节点的【手动流程化测试】。
 * 1.需要环境：nodejs环境运行本js文件（先在下文配置好）。我是vscode打开本脚本后直接运行测试（需要vscode安装Code Runner扩展）
 * 2.手动范围有：
	2.1 节点名要手动填写，特别是
		<tags>
			<item xxx/>或下一条的
			<tags xxx/>或上一条的
		</tags>两层多节点
		和只有一层的<tags  xxx/>
	2.2 parse、buildUrl/parseUrl都要手动填写函数名
	2.3 没自动加载插件的header/ua/referer/cookie配置；
	2.4 没自动加载插件者自定义的require库
 * 3.更新日志  v2.5.2require多多猫版cheerio库 v2.5同步请求库sync-request访问网页（可能会比异步请求库慢很多，以后再恢复增加异步版，也可能只是我网络问题） v2.4原生cheerio解析sited插件 v2.3采用es6箭头函数
 */
console.log(new Date().toLocaleTimeString()); //打印本地时间

var fs = require('fs');
var path = require('path');
// var http = require('http');
// var https = require('https');
var querystring = require('querystring');

function print(string) {
	console.log(string);
} //定义插件里print命令
var cheerio = require('./lib/main_res_raw_cheerio.js'); //因为多多猫版cheerio库对于原生cheerio库有缺失，不能影响原插件运行find()效果所以保留多多猫版，并且使用cheerio名称因为插件里也是cheerio。在http://sited.noear.org/addin/js/cheerio.js 下载到本地，然后尾行加上exports = module.exports = cheerio; 才能require()。
var native_cheerio = require('cheerio'); //引入原生cheerio库，详见后面
var urlencode = require('urlencode'); //可实现GBK编码的urlencode
var request = require('sync-request'); //引入同步请求库sync-request访问网页，同步版慢还是被网站拒绝？
var iconv = require('iconv-lite'); //处理gbk等编码
//没sync-request等模块的话就命令行里面进入本文件所在目录本地安装npm install -save cheerio urlencode sync-request iconv  等等


var sited_file = fs.readFileSync(path.join(__filename, '../../../../../apachedocument/3.sited.xml'), 'utf-8'); //读取sited或sited.xml插件文本。如果不懂fs模块相对路径的坑也不知道path.join的建议替换为readFileSync('文件绝对路径')。
var $_ = native_cheerio.load(sited_file, {
	normalizeWhitespace: false,
	recognizeSelfClosing: true,
	xmlMode: true,
	recognizeCDATA: true,
	decodeEntities: false
}) //定义$_通过原生cheerio库读取sited插件，以区别多多猫版cheerio库解析html的$。因为多多猫版cheerio库xml模式recognizeCDATA失败（会把code节点里面有连起来的<和其他字符当作开标签）
eval($_('code').text()); //运行插件script/code(兼容旧格式jscript/code)节点即js代码部分

/*以上是脚本前期准备，以下是执行部分(手动填写节点函数名测试流程)*/
var method = 'GET'; //或者
// var method = 'POST';根据原插件实际情况通过注释来配置
var encoding = 'GB18030'; //或者'GBK'
// var encoding = 'utf8';
var postbody = querystring.stringify({
	//	keyword: '需要post时，关键词填入这里再注释掉'
});
var headers = {
	//'Accept':'*/*',
	//'accept-encoding':'gzip, deflate, br',//gzip是接收网页压缩的请求头参数，我们插件者要注释掉
	//'Accept-Language':'zh-CN,zh;q=0.8',
	//"content-type":"application/x-www-form-urlencoded",
	// 'Connection': 'keep-alive',
	//'Cookie':'xx',
	// 'Host': url.match(/\/\/([^\/]+)/i)[1],
	// 'Referer': url.match(/.+?\/\/[^\/]+/i)[0] + '/',
	// 'User-Agent': 'iPhone',
}; //源网站、原插件需要特殊headers才配置这里。浏览器控制台headers粘贴过来([^:\s]+):\s*(.+)$正则表达式替换为'$1':'$2',

var ddlog //把ddlog定义为某节点parse return出来的字符串，即多多猫调试模式log日志内容。
var u1 = $_('tags').children().eq(0).attr('url').replace(/amp;/ig, ''); //自己选择从hots/updates/tags哪个节点url属性开始测试。
var u2 = 'https://wap.fushutuan.net/'; //或者手动填写url
var url = u1;

ddlog = tags_parse(url, iconv.decode(request(method, url, {
	headers: headers,
	body: postbody,
}).getBody(), encoding));
print('tags::' + JSON.stringify(JSON.parse(ddlog).slice(0, 3)) + '……\r\n'); //把上一条命令的log日志转换为js数组后slice提取前3个条目再转换为JSON字符串打印省空间。接下来根据第一个条目url进入下一层节点parse解析。

url = JSON.parse(ddlog)[0].url.replace(/@page/i, "1");
ddlog = tag_parse(url, iconv.decode(request(method, url, {
	headers: headers,
	body: postbody,
}).getBody(), encoding));
print('tag[1]::' + JSON.stringify(JSON.parse(ddlog).slice(0, 3)) + '……\r\n');

url = book_buildUrl(JSON.parse(ddlog)[0].url); //xx_buildUrl是原插件里面book节点函数，自己插件没有的就直接写等于JSON.parse(ddlog)[0].url
ddlog = book_parse(url, iconv.decode(request(method, url, {
	headers: headers,
	body: postbody,
}).getBody(), encoding));
print('book[1]::' + ddlog.slice(0, 500) + '……\r\n');

var search_url = $_('search').attr('url').replace(/amp;/ig, '').replace('@key', '') + urlencode('我的', encoding); //测试搜索节点时搜索词语替换urlencode里面字符串
var searchlog = search_parse(search_url, iconv.decode(request(method, search_url, {
	headers: headers,
	body: postbody,
}).getBody(), encoding));
print('search::' + JSON.stringify(JSON.parse(searchlog).slice(0, 3)) + '……\r\n');